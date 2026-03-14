const path = "../../../assets/audio/";

const sounds = {
  comms: {
    join: require(path + "comms/join.wav"),
    leave: require(path + "comms/leave.wav"),
    screen_share: {
      start: require(path + "comms/screen_share/start.wav"),
      stop: require(path + "comms/screen_share/stop.wav"),
    },
  },
};

export default sounds;
