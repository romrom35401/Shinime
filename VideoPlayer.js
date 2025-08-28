// VideoPlayer.js
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Slider,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';

const VideoPlayer = ({ videoUrl, episodeTitle, episodeNumber, duration }) => {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0.0);

  const handlePlayPause = () => {
    setPaused(!paused);
  };

  const handleProgress = (data) => {
    setCurrentTime(data.currentTime);
  };

  const seekBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    videoRef.current.seek(newTime);
    setCurrentTime(newTime);
  };

  const seekForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    videoRef.current.seek(newTime);
    setCurrentTime(newTime);
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        paused={paused}
        onProgress={handleProgress}
        onEnd={() => setPaused(true)}
        resizeMode="contain"
      />
      <View style={styles.controls}>
        <TouchableOpacity onPress={seekBackward}>
          <Ionicons name="chevron-back-circle" size={30} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handlePlayPause}>
          <Ionicons name={paused ? "play-circle" : "pause-circle"} size={30} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={seekForward}>
          <Ionicons name="chevron-forward-circle" size={30} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>
          {episodeTitle} (E{episodeNumber})
        </Text>
        <Text style={styles.timer}>
          {`${currentTime.toFixed(0)} / ${duration} sec`}
        </Text>
        <Slider 
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={(value) => videoRef.current.seek(value)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '70%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 10,
    width: '100%',
    padding: 10,
  },
  info: {
    marginTop: 10,
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
  },
  timer: {
    color: 'white',
    paddingVertical: 5,
  },
  slider: {
    width: '90%',
    height: 40,
  },
});

export default VideoPlayer;
