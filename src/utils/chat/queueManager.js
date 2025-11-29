import gateway from "../backend-services/api-gateway.js";
import Database from "../storage/database.js";
import eventEmitter from "../global/Events/EventEmitter.js";

class QueueManager {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.isConnected = false;
    this.processingInterval = 100; // 0.1 seconds
    this.getConnectionStatus = undefined;
  }

  // Initialize the queue manager
  async initialize(getConnectionStatus) {
    if (getConnectionStatus) {
      this.getConnectionStatus = getConnectionStatus;
    }
    await this.loadQueue();
    this.startConnectionMonitoring();
    this.processQueue();
  }

  // Add a job to the queue
  async addJob(type, params, id = null) {
    const job = {
      type, // 'send' or 'confirm'
      params,
    };

    if (id) {
      job.id = id;
    } else {
      job.id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    this.queue.push(job);

    // Add to database as pending message
    await this.saveJob(job);

    // Emit event for new message added to queue
    await eventEmitter.getEmitter().emit("newMessage", {
      chatUUID: params.chatUUID,
      id: job.id,
      content: params.content,
      created_at: undefined,
      senderUUID: params.senderUUID,
      type: params.type || "message",
      files: params.files || [],
    });

    console.log("Job added to queue:", job.id, type);

    // Process immediately if connected
    if (this.isConnected && !this.isProcessing) {
      this.processQueue();
    }
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

  // Process the queue
  async processQueue() {
    if (this.isProcessing || !this.isConnected || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log("Processing queue, jobs remaining:", this.queue.length);

    const job = this.queue[0];

    try {
      if (job.type === "send") {
        const { chatUUID, content, type = "message" } = job.params;

        let files = [];
        // Remove files uri before sending
        if (job.params.files && job.params.files.length > 0) {
          files = job.params.files.map((file) => {
            const { uri, ...rest } = file;
            return rest;
          });
        }

        const { success, message } = await gateway.message.send(
          chatUUID,
          content,
          type,
          files
        );

        if (success) {
          console.log("Job completed successfully:", job.id);

          if (message.files && message.files.length > 0) {
            // Update files with uris from original job
            for (let i = 0; i < message.files.length; i++) {
              const originalFile = job.params.files.find(
                (f) => f.id === message.files[i].id
              );
              if (originalFile) {
                message.files[i].uri = originalFile.uri;
                message.files[i].mimeType = originalFile.mimeType;
              }
            }
          }

          // Notify that message was sent successfully
          eventEmitter.getEmitter().emit("messageSent", {
            tempId: job.id,
            message,
          });

          this.queue.shift(); // Remove completed job
          await this.removeJob(job.id);
        }
      } else if (job.type === "confirm") {
        const { messageUUID } = job.params;
        const result = await gateway.message.confirm(messageUUID);
        success = result.success;
        // DA CAPIRE DADDY @SamueleOrazioDurante
        if (success) {
          console.log("Job completed successfully:", job.id);
          // Notify that message was sent successfully
          eventEmitter.getEmitter().emit("messageConfirmed", {
            tempId: job.id,
            result,
          });

          this.queue.shift(); // Remove completed job
          await this.removeJob(job.id);
        }
      }
    } catch (error) {
      console.error("Job failed:", job.id, error);
      job.retries++;

      if (job.retries >= job.maxRetries) {
        console.log("Job failed permanently, removing:", job.id);
        this.queue.shift(); // Remove failed job after max retries
        await this.removeJob(job.id);
      } else {
        // Move to end of queue for retry
        this.queue.shift();
        this.queue.push(job);
        await this.removeJob(job.id);
      }
    }

    this.isProcessing = false;

    // Continue processing if there are more jobs
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.processingInterval);
    }
  }

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
}
const queueManager = new QueueManager();
export default queueManager;
