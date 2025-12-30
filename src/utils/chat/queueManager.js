import { v6 } from "uuid";

import gateway from "../backend-services/api-gateway.js";
import Database from "../storage/database";
import eventEmitter from "../global/Events/EventEmitter.js";
import S3Uploader from "../storage/file/s3Bucket.js";
import storage from "../storage/file";

class QueueManager {
  constructor() {
    this.initialized = false;
    this.queue = [];
    this.isProcessing = false;
    this.isConnected = false;
    this.processingInterval = 100; // 0.1 seconds
    this.errorDelay = 5000; // 5 seconds
    this.maxRetries = 5;
    this.getConnectionStatus = undefined;
  }

  // Initialize the queue manager
  async initialize(getConnectionStatus) {
    if (this.initialized) return;
    if (getConnectionStatus) {
      this.getConnectionStatus = getConnectionStatus;
    }
    await this.loadQueue();
    this.startConnectionMonitoring();
    this.processQueue();
    this.initialized = true;
  }

  // Start monitoring connection state
  startConnectionMonitoring() {
    // Check connection every 2 seconds
    setInterval(() => {
      const connected = this.getConnectionStatus();
      if (connected !== this.isConnected) {
        this.isConnected = connected;
        console.log(
          "Connection state changed:",
          connected ? "connected" : "disconnected"
        );
        if (this.isConnected) {
          this.processQueue();
        }
      }
    }, 2000);
  }

  startProcessing() {
    // Process immediately if connected
    if (this.isConnected && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Add an inbound message job to the queue
   * @param {Object} message
   */
  async addInboundMessageJob(message) {
    const params = {
      message: { ...message },
      status: "PENDING_DOWNLOAD",
      attempts: 0,
      maxRetries: this.maxRetries,
    };

    await this.addJob(v6(), "INBOUND_MESSAGE", params);

    this.startProcessing();
  }

  /**
   * Add an outgoing message job to the queue
   * @param {Object} message { senderUUID, content, type, files { uuid, index, name, uri, ref, mimeType, uploadURL } }
   * @param {Object} chat { uuid, name, type, handle, profilePictureUUID, member }
   * @param {String?} id (default = v6())
   * @param {String?} status (default = "PENDING_SEND")
   * @returns
   */
  async addOutgoingMessageJob(
    message,
    chat,
    id = null,
    status = "PENDING_SEND"
  ) {
    // No id means no server UUID yet, so generate a UUIDv7
    if (!id) {
      id = v6();
    }

    const params = {
      message: { ...message },
      chat,
      status,
      attempts: 0,
      maxRetries: this.maxRetries,
    };

    // No chat UUID means chat is being created
    if (!params.chat.uuid) {
      params.status = "CREATING_CHAT";
      const database = await Database.create();
      // Check if chat is already pending creation, to avoid duplicate jobs just add message to pending messages attached to chat creation
      if (await database.isChatPendingCreation(id)) {
        console.log("Chat is already pending creation in queue:", id);
        await this.addPendingMessagesForChatCreation(id, message);
        return;
      }
    }

    await this.addJob(id, "OUTGOING_MESSAGE", params);

    // @SamueleOrazioDurante da capire sto eventEmitter
    if (status === "PENDING_SEND" || status === "CREATING_CHAT") {
      // Emit event for new message added to queue
      await eventEmitter.getEmitter().emit("message:new", {
        chatUUID: chat.uuid,
        id,
        content: message.content,
        created_at: undefined,
        senderUUID: message.senderUUID,
        type: message.type,
        files: message.files || [],
      });
    }

    this.startProcessing();
  }

  /**
   * Add a job to the queue and save it to persistent storage
   * @param {String} id
   * @param {String} type
   * @param {Object} params - Payload for the job
   */

  async addJob(id, type, params) {
    const job = {
      id,
      type,
      params,
    };
    this.queue.push(job);
    await this.saveJob(job);
  }

  /**
   * Process the job queue
   * @returns
   */
  async processQueue() {
    if (this.isProcessing || !this.isConnected || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log("Processing queue, jobs remaining:", this.queue.length);

    const job = this.queue[0];

    try {
      switch (job.type) {
        case "INBOUND_MESSAGE":
          await this.processInboundMessageJob(job);
          break;
        case "OUTGOING_MESSAGE":
          await this.processOutgoingMessageJob(job);
          break;
        default:
          // Handle other job types
          console.error("Job type not recognized:", job.type);
          this.queue.shift(); // Remove unknown job
          await this.removeJob(job.id);
          throw new Error("Job type not recognized");
      }
      // After processing, remove job from queue
      this.queue.shift();
      await this.removeJob(job.id);
      console.info("Job completed successfully:", job.id);
    } catch (error) {
      console.error("Job failed:", job.id, error);
      // Increment retry count
      job.params.attempts++;
      if (job.params.attempts >= job.params.maxRetries) {
        console.error("Job failed permanently, removing:", job.id);
        this.queue.shift(); // Remove failed job after max retries
        await this.removeJob(job.id);
      }
      // Wait errorDelay before continuing
      await new Promise((resolve) => setTimeout(resolve, this.errorDelay));
    }

    this.isProcessing = false;
    // Continue processing if there are more jobs
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.processingInterval);
    }
  }

  /**
   * Process an inbound message job
   * @param {Object} job
   */
  async processInboundMessageJob(job) {
    switch (job.params.status) {
      case "PENDING_DOWNLOAD":
        await this.processPendingDownloadJob(job);
        break;
      default:
        throw new Error("Unknown inbound message job status");
    }
  }

  /**
   * Process a pending download job
   * @param {Object} job
   */
  async processPendingDownloadJob(job) {
    const { message } = job.params;

    const { id, chatUUID, files } = message;

    const filesToDownload = [];

    for (const file of files) {
      if (file.ref) {
        continue;
      }
      const ref = await this._getRef(file.uuid);
      if (ref) {
        file.ref = ref;
      } else {
        filesToDownload.push(file.uuid);
      }
    }

    if (filesToDownload && filesToDownload.length > 0) {
      const { success, message: downloadedMessage } =
        await gateway.message.retrieve(chatUUID, id);

      const downloadedFiles = downloadedMessage.files;

      if (success && downloadedFiles && downloadedFiles.length > 0) {
        await Promise.all(
          filesToDownload.map(async (fileToDownload) => {
            const downloadedFile = downloadedFiles.find(
              (df) => df.uuid === fileToDownload
            );

            if (downloadedFile && downloadedFile.downloadURL) {
              // Download file from S3 bucket
              const bytes = await S3Uploader.download(
                downloadedFile.downloadURL
              );

              if (!bytes) {
                throw new Error("File download failed from S3");
              }

              // Get size of downloaded file (can be Blob or ArrayBuffer depending on platform)
              const downloadedSize = S3Uploader.getSizeFromBytes(bytes);

              // Check declared size matches downloaded size
              if (downloadedSize != downloadedFile.size) {
                const errorMsg = `Downloaded file size mismatch for file ${fileToDownload}: expected ${downloadedFile.size}, got ${downloadedSize}`;
                throw new Error(errorMsg);
              }

              // Save file to storage
              const { ref, size } = await storage.save.byBytes(
                bytes,
                fileToDownload
              );

              if (!ref || !size || size <= 0) {
                const errorMsg = `File save to storage failed for file ${fileToDownload}: ref=${ref}, size=${size}`;
                throw new Error(errorMsg);
              }

              if (downloadedFile.size !== size) {
                const errorMsg = `Saved file size mismatch for file ${fileToDownload}: expected ${downloadedFile.size}, got ${size}`;
                throw new Error(errorMsg);
              }

              // Update files object in message with new ref
              const file = message.files.find((f) => f.uuid === fileToDownload);
              if (file) {
                file.ref = ref;
              } else {
                throw new Error("File not found in message after download");
              }

              // Update file info in database
              await this._addFileRef(fileToDownload, ref);

              await this.fileDownloaded(message, file);
            } else {
              throw new Error("Downloaded file info missing");
            }
          })
        );
      } else {
        throw new Error("Message download failed");
      }
    } else {
      console.info("No files to download for message:", id);
    }
  }

  /**
   * Process an outgoing message job
   * @param {Object} job
   */
  async processOutgoingMessageJob(job) {
    switch (job.params.status) {
      case "CREATING_CHAT":
        await this.processCreatingChatJob(job);
        break;
      case "PENDING_SEND":
        await this.processSendingMessageJob(job);
        break;
      case "PENDING_MODIFY":
        await this.processModifyMessageJob(job);
        break;
      case "PENDING_UPLOAD":
        await this.processPendingUploadJob(job);
        break;
      case "PENDING_CONFIRM":
        await this.processPendingConfirmJob(job);
        break;
      default:
        throw new Error("Unknown outgoing message job status");
    }
  }

  /**
   * Process a creating chat job
   * @param {Object} job
   */
  async processCreatingChatJob(job) {
    const response = await gateway.chat.create(
      "DM",
      job.params.chat.member,
      null,
      null
    );
    const success = response.success;
    const newChat = response.chat;
    if (success) {
      newChat.name = newChat.members[0].name;
      console.info("Chat created successfully:", newChat);
      eventEmitter.getEmitter().emit("newChat", { chat: newChat, id: job.id });

      // Create new job for every message pending send in this chat
      await this.loadPendingMessagesForChatCreation(job.id, newChat);
    } else {
      throw new Error("Failed to create chat");
    }
  }

  /**
   * Process a sending message job
   * @param {Object} job
   */
  // @SamueleOrazioDurante la logica qui è rimasta quella vecchia, da capire se è ottimizzata o va rifatta
  async processSendingMessageJob(job) {
    const chatUUID = job.params.chat.uuid;
    const { content, type = "message", files } = job.params.message;

    let cleanFiles = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const { ref, size } = await storage.save.byUri(file.uri);
        file.ref = ref;
        file.size = size;
      }
      // Remove files ( uri, ref ) before sending
      cleanFiles = files.map((file) => {
        const { uri, ref, ...rest } = file;
        return rest;
      });
    }

    const { success, message } = await gateway.message.send(
      chatUUID,
      content,
      type,
      cleanFiles
    );

    if (success) {
      if (message.files && message.files.length > 0) {
        // Update files with refs from original job
        for (let i = 0; i < message.files.length; i++) {
          if (files[i]) {
            message.files[i].name = files[i].name;
            message.files[i].ref = files[i].ref;
            message.files[i].mimeType = files[i].mimeType;
            message.files[i].size = files[i].size;
          }
        }
      }

      if (message.status === "sent") {
        // Notify that message was sent successfully
        await this.messageSent(job.id, message);
      } else if (message.status === "pending") {
        // If message is pending, modify the job to an upload one
        await this.messageUploading(job.id, message);
        await this.addOutgoingMessageJob(
          message,
          job.params.chat,
          message.messageUUID,
          "PENDING_UPLOAD"
        );
      } else {
        throw new Error("Message sending failed");
      }
    } else {
      throw new Error("Message sending failed");
    }
  }

  /**
   * Process a modify message job
   * @param {Object} job
   */

  async processModifyMessageJob(job) {
    console.warn("Modify message job processing not implemented yet");
  }

  /**
   * Process a pending upload job
   * @param {Object} job
   */
  async processPendingUploadJob(job) {
    // Upload every file to S3 Bucket
    const { message } = job.params;
    const { files } = message;
    for (const file of files) {
      if (file.ref) {
        const uri = await storage.read(file.ref);
        await S3Uploader.upload(file.uploadURL, uri, this.notifyProgress);
      } else {
        throw new Error("File reference missing for upload");
      }
    }
    // After all files are uploaded, upload job to confirm
    await this.addOutgoingMessageJob(
      message,
      job.params.chat,
      v6(),
      "PENDING_CONFIRM"
    );
  }

  /**
   * Process a pending confirm job
   * @param {Object} job
   */
  async processPendingConfirmJob(job) {
    const { messageUUID } = job.params.message;

    const { success, message } = await gateway.message.confirm(messageUUID);
    if (success) {
      // Notify that message was sent successfully
      message.files = job.params.message.files;
      await this.messageSent(messageUUID, message);
    } else {
      throw new Error("Message confirmation failed");
    }
  }

  // ROBA VECCHIA
  /**
   * Save a single job to the database
   * @param {string} job - The job to save
   * @return {Promise<void>}
   */
  async saveJob(job) {
    try {
      const database = await Database.create();
      await database.addPendingMessage({
        id: job.id,
        jobType: job.type,
        ...job.params,
      });
    } catch (error) {
      console.error("Error saving job to database:", error);
    }
  }

  /**
   * Remove a single job from the database
   * @param {string} jobId - The ID of the job to remove
   * @return {Promise<void>}
   */
  async removeJob(jobId) {
    try {
      const database = await Database.create();
      await database.removePendingMessage(jobId);
    } catch (error) {
      console.error("Error removing job from database:", error);
    }
  }

  /**
   * Modify a job in the queue to an upload job
   * @param {string} jobId - The ID of the job to modify
   * @param {object} params - The new parameters for the upload job
   * @return {Promise<void>}
   */

  async moveJobToUpload(jobId, params) {
    const jobIndex = this.queue.findIndex((job) => job.id === jobId);
    if (jobIndex !== -1) {
      this.queue[jobIndex].id = params.messageUUID;
      this.queue[jobIndex].type = "upload";
      this.queue[jobIndex].params = params;

      console.log("Job modified to upload:", jobId);

      // Update in database
      try {
        const database = await Database.create();
        await database.updatePendingMessageForUpload(
          jobId,
          params.messageUUID,
          params.files
        );
      } catch (error) {
        console.error("Error modifying job in database:", error);
      }
    }
  }

  /**
   * Modify a job in the queue to a confirm job
   * @param {string} jobId - The ID of the job to modify
   * @return {Promise<void>}
   */

  async moveJobToConfirm(jobId) {
    const jobIndex = this.queue.findIndex((job) => job.id === jobId);
    if (jobIndex !== -1) {
      const messageUUID = this.queue[jobIndex].id;
      this.queue[jobIndex].type = "confirm";
      this.queue[jobIndex].params = {
        messageUUID,
        files: this.queue[jobIndex].params.files,
      };

      console.log("Job modified to confirm:", jobId);

      // Update in database
      try {
        const database = await Database.create();
        await database.updatePendingMessageToConfirm(jobId);
      } catch (error) {
        console.error("Error modifying job in database:", error);
      }
    }
  }

  /**
   * Load the queue from persistent storage
   * @return {Promise<void>}
   */

  async loadQueue() {
    try {
      const database = await Database.create();
      const pendingMessages = await database.getPendingMessages();

      if (!pendingMessages) {
        this.queue = [];
        console.log(
          "Queue loaded from database, jobs count:",
          this.queue.length
        );
        return;
      }

      this.queue = pendingMessages.map((msg) => ({
        id: msg.id,
        type: msg.jobType,
        params: {
          chatUUID: msg.chatUUID,
          content: msg.content,
          type: msg.messageType,
          files: msg.files,
          senderUUID: msg.senderUUID,
        },
      }));

      console.log("Queue loaded from database, jobs count:", this.queue.length);
    } catch (error) {
      console.error("Error loading queue from database:", error);
    }
  }

  // ROBA VECCHIA

  // Job queue helpers for persistent storage

  // @SamueleOrazioDurante sta roba è 100% possibile ottimizzarla dai, riduci ste LOC please
  async saveJob(job) {
    return;
    const jobData = {
      id: job.id,
      type: job.type,
      attempts: job.attempts,
    };

    const chatData = {};
    const messageData = {};
    const filesData = [];

    switch (job.type) {
      case "INBOUND_MESSAGE":
        jobData.payload = job.params;
        break;
      case "OUTGOING_MESSAGE":
        switch (job.params.status) {
          case "CREATING_CHAT":
            // Job Data
            jobData.ref_table = "pending_chat";

            // Chat Data
            chatData.id = job.id;
            chatData.name = job.params.chat.name;
            chatData.type = job.params.chat.type;
            chatData.handle = job.params.chat.handle;
            chatData.profilePictureUUID = job.params.chat.profilePictureUUID;
            chatData.member = job.params.chat.member;

            // Message Data
            messageData.id = v6();
            messageData.chatUUID = job.id;
            messageData.senderUUID = job.params.message.senderUUID;
            messageData.content = job.params.message.content;
            messageData.type = job.params.message.type;
            messageData.status = job.params.message.status;

            // File Data
            if (
              job.params.message.files &&
              job.params.message.files.length > 0
            ) {
              for (const file of job.params.message.files) {
                filesData.push({
                  index: file.index,
                  uri: file.uri,
                  mimeType: file.mimeType,
                  uuid: file.uuid,
                  uploadURL: file.uploadURL,
                });
              }
            }
            break;
          case "PENDING_SEND":
            // Job Data
            jobData.ref_table = "pending_message";

            // Message Data
            messageData.id = job.id;
            messageData.chatUUID = job.params.chat.uuid;
            messageData.senderUUID = job.params.message.senderUUID;
            messageData.content = job.params.message.content;
            messageData.type = job.params.message.type;
            messageData.status = job.params.message.status;

            // File Data
            if (
              job.params.message.files &&
              job.params.message.files.length > 0
            ) {
              for (const file of job.params.message.files) {
                filesData.push({
                  index: file.index,
                  name: file.name,
                  uri: file.uri,
                  mimeType: file.mimeType,
                  uuid: file.uuid,
                  uploadURL: file.uploadURL,
                });
              }
            }

            break;
          case "PENDING_MODIFY":
            break;

          case "PENDING_UPLOAD":
            // Job Data
            jobData.ref_table = "pending_message";
            // Message Data
            messageData.id = job.id;
            messageData.chatUUID = job.params.chat.uuid;
            messageData.senderUUID = job.params.message.senderUUID;
            messageData.content = job.params.message.content;
            messageData.type = job.params.message.type;
            messageData.status = job.params.message.status;
            messageData.messageUUID = job.params.message.messageUUID;
            // File Data
            if (
              job.params.message.files &&
              job.params.message.files.length > 0
            ) {
              for (const file of job.params.message.files) {
                filesData.push({
                  index: file.index,
                  name: file.name,
                  uri: file.uri,
                  mimeType: file.mimeType,
                  uuid: file.uuid,
                  uploadURL: file.uploadURL,
                });
              }
            }
            break;
          case "PENDING_CONFIRM":
            // Job Data
            jobData.ref_table = "pending_message";
            // Message Data
            messageData.id = job.id;
            messageData.chatUUID = job.params.chat.uuid;
            messageData.senderUUID = job.params.message.senderUUID;
            messageData.content = job.params.message.content;
            messageData.type = job.params.message.type;
            messageData.status = job.params.message.status;
            messageData.messageUUID = job.params.message.messageUUID;
            // File Data
            if (
              job.params.message.files &&
              job.params.message.files.length > 0
            ) {
              for (const file of job.params.message.files) {
                filesData.push({
                  index: file.index,
                  name: file.name,
                  uri: file.uri,
                  mimeType: file.mimeType,
                  uuid: file.uuid,
                  uploadURL: file.uploadURL,
                });
              }
            }
            break;
          default:
            throw new Error("Unknown outgoing message job status");
        }
        break;
    }

    const database = await Database.create();
    await database.job.save(job);
  }

  async removeJob(jobId) {
    return;
    const database = await Database.create();
    await database.job.remove(jobId);
  }

  async loadJobs() {
    const database = await Database.create();
    const pendingMessages = await database.job.loadAll();
    return pendingMessages;
  }

  // Chat creation utilities

  /**
   * Add pending messages for a chat that is being created
   * @param {String} chatUUID
   * @param {Object} message { senderUUID, content, type, files { uuid, index, uri, ref, mimeType, uploadURL} }
   */
  async addPendingMessagesForChatCreation(chatUUID, message) {
    const messageData = {
      id: v6(),
      chatUUID,
      senderUUID: message.senderUUID,
      content: message.content,
      type: message.type,
      status: message.status,
    };

    const fileData = [];
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        fileData.push({
          index: file.index,
          name: file.name,
          uri: file.uri,
          ref: file.ref,
          mimeType: file.mimeType,
          uuid: file.uuid,
          uploadURL: file.uploadURL,
        });
      }
    }

    const database = await Database.create();
    await database.message.pending.add(messageData, fileData);
  }

  /**
   * Load pending messages to queue for a chat that has just been created
   * @param {String} pendingChatUUID
   * @param {Object} newChat { uuid, name, type, handle, profilePictureUUID, member }
   */

  async loadPendingMessagesForChatCreation(pendingChatUUID, newChat) {
    const database = await Database.create();
    const pendingMessages = await database.message.pending.getByChatUUID(
      pendingChatUUID
    );
    for (const pendingMessage of pendingMessages) {
      await database.message.pending.remove(pendingMessage.id);
      await this.addOutgoingMessageJob(
        pendingMessage,
        newChat,
        pendingMessage.id
      );
    }
  }

  // Download utilities

  /**
   * Check which files need to be downloaded
   * @param {String} fileUUID
   */
  async _getRef(fileUUID) {
    const database = await Database.create();
    return await database.file.get.ref(fileUUID);
  }

  async _addFileRef(fileUUID, ref) {
    const database = await Database.create();
    await database.file.update.ref(fileUUID, ref);
  }

  // Event emitters for message status updates

  /**
   * Notify that a message was sent successfully
   * @param {String} tempId
   * @param {Object} message
   */
  async messageSent(tempId, message) {
    const database = await Database.create();
    await database.addMessage(message);
    eventEmitter.getEmitter().emit("message:sent", { tempId, message });
  }

  /**
   * Notify that a message is uploading
   * @param {String} tempId
   * @param {Object} message
   */
  messageUploading(tempId, message) {
    eventEmitter.getEmitter().emit("message:upload", {
      tempId,
      message,
    });
  }

  /**
   * Notify upload progress
   * @param {Object} progress { loaded, total }
   */
  notifyProgress(progress) {
    eventEmitter.getEmitter().emit("message:progress", progress);
  }

  /**
   * Notify that a file was downloaded
   * @param {Object} message
   * @param {Object} file
   */

  async fileDownloaded(message, file) {
    eventEmitter.getEmitter().emit("message:downloaded", { message, file });
  }

  /**
   * Notify that a message failed to send
   * @param {String} tempId
   * @param {Object} error
   */
  messageFailed(tempId, error) {
    eventEmitter.getEmitter().emit("message:failed", { tempId, error });
  }
}

const queueManager = new QueueManager();
export default queueManager;
