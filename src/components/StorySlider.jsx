//==============================================
// IMPORTS
//==============================================
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PlusCircle, X, Save, Loader, ImagePlus, Clock, Play, Pause, Edit } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import html2canvas from 'html2canvas';

//==============================================
// UTILITIES / SERVICES
//==============================================
const ffmpeg = new FFmpeg({
  log: true,
});

//==============================================
// MODAL COMPONENTS
//==============================================
const ProgressModal = ({ isOpen, progress, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="loading-container">
          <Loader className="animate-spin" />
          <p>{message}</p>
          {progress !== null && (
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CaptionModal = ({ isOpen, onClose, onSubmit, fileName }) => {
  const [caption, setCaption] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Add a Caption</h3>
        <p className="modal-filename">{fileName}</p>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Enter your caption..."
          className="modal-input"
          autoFocus
        />
        <div className="modal-buttons">
          <button className="modal-button cancel" onClick={onClose}>
            Skip
          </button>
          <button className="modal-button submit" onClick={() => onSubmit(caption)}>
            Add Caption
          </button>
        </div>
      </div>
    </div>
  );
};
// Add this new modal component
const StartPointModal = ({ onClose, onSave, story }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const mediaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = story?.startTime || 0;
    }
  }, [story]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleSliderChange = (e) => {
    const newTime = parseFloat(e.target.value);
    if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handlePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!story) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content start-point-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Set Start Point</h3>
        
        <div className="media-preview">
          {story.type === 'video' ? (
            <video
              ref={mediaRef}
              src={story.url}
              onTimeUpdate={handleTimeUpdate}
              className="preview-video"
              playsInline
            />
          ) : (
            <div className="audio-preview">
              <div className="audio-icon">🎵</div>
              <audio
                ref={mediaRef}
                src={story.url}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          )}
        </div>

        <div className="playback-controls">
          <button 
            className="play-pause-button"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <span className="time-display">{formatTime(currentTime)}</span>
        </div>

        <div className="slider-container">
          <input
            type="range"
            min="0"
            max={mediaRef.current?.duration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            className="time-slider"
            step="0.1"
          />
        </div>

        <div className="modal-buttons">
          <button 
            className="modal-button reset"
            onClick={() => {
              if (mediaRef.current) {
                mediaRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
          >
            Reset
          </button>
          <button 
            className="modal-button save"
            onClick={() => onSave(currentTime)}
          >
            Set Start Point
          </button>
        </div>
      </div>
    </div>
  );
};

//==============================================
// EDIT PANEL COMPONENT
//==============================================
const EditPanel = ({ stories, onClose, onThumbnailClick }) => {
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="edit-panel">
      <div className="edit-panel-header">
        <h3>Edit Media Start Points</h3>
        <button className="edit-panel-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="thumbnails-container">
        {stories
          .filter((story) => story.type === 'video' || story.type === 'audio')
          .map((story, index) => (
            <div
              key={index}
              className="thumbnail"
              onClick={() => onThumbnailClick(story)}
            >
              {story.type === 'video' ? (
                <div className="video-thumbnail">
                  <video src={story.url} muted />
                  <span className="play-icon">▶️</span>
                </div>
              ) : (
                <div className="audio-thumbnail">
                  <span className="audio-icon">🎵</span>
                </div>
              )}
              <p className="thumbnail-caption">{story.caption}</p>
              <p className="thumbnail-timestamp">
                Start: {formatTime(story.startTime)}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

//==============================================
// BOTTOM MENU COMPONENT
//==============================================
const BottomMenu = ({ onFileUpload, onSaveSession, onPlayPause, isPlaying, duration, onDurationChange, onEdit }) => {
  const [showDurationPanel, setShowDurationPanel] = useState(false);

  return (
    <div className="bottom-menu">
      {showDurationPanel && (
        <div className="duration-panel">
          <div className="duration-controls">
            <input 
              type="range"
              min="1"
              max="12"
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="duration-slider"
            />
            <div className="duration-text">
              Speed: {duration}s/image
            </div>
          </div>
          <div className="duration-timeline">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="timeline-marker">
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bottom-menu-buttons">
        <button 
          className="bottom-menu-button"
          onClick={() => setShowDurationPanel(!showDurationPanel)}
        >
          <Clock className="bottom-menu-icon" />
          <span className="bottom-menu-text"></span>
        </button>

        <button 
          className="bottom-menu-button"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="bottom-menu-icon" />
          ) : (
            <Play className="bottom-menu-icon" />
          )}
          <span className="bottom-menu-text">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <div className="bottom-menu-right-group">
          <button 
            className="bottom-menu-button"
            onClick={onEdit}
          >
            <Edit className="bottom-menu-icon" />
            <span className="bottom-menu-text">Edit</span>
          </button>

          <label className="bottom-menu-button">
            <ImagePlus className="bottom-menu-icon" />
            <span className="bottom-menu-text"></span>
            <input
              type="file"
              id="file-upload-bottom"
              accept="image/*,video/*,audio/*"
              multiple
              onChange={onFileUpload}
              className="hidden-input"
            />
          </label>

          <button className="bottom-menu-button" onClick={onSaveSession}>
            <Save className="bottom-menu-icon" />
            <span className="bottom-menu-text"></span>
          </button>
        </div>
      </div>
    </div>
  );
};

//==============================================
// MAIN STORY SLIDER COMPONENT
//==============================================
const StorySlider = () => {
  useEffect(() => {
    loadFFmpeg().catch(console.error);
  }, []);
  //--------------------------------------------
  // State Declarations
  //--------------------------------------------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stories, setStories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saveProgress, setSaveProgress] = useState(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [duration, setDuration] = useState(2); // Default duration
  const [showEditPanel, setShowEditPanel] = useState(false); 
  const [showStartPointModal, setShowStartPointModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);

  // Refs and Animations
  const mediaRef = useRef(null);
  const intervalRef = useRef(null);
  const controls = useAnimation();

  //--------------------------------------------
  // Start Point Handler
  //--------------------------------------------

  const handleStartPointSave = (startTime) => {
    setStories(stories.map(story => 
      story === selectedStory 
        ? { ...story, startTime } 
        : story
    ));
    setShowStartPointModal(false);
    setSelectedStory(null);
  };

  //--------------------------------------------
  // Auto-Rotation Logic
  //--------------------------------------------
  const startAutoRotation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex < stories.length - 1) {
          return prevIndex + 1;
        } else {
          clearInterval(intervalRef.current); // Stop at the end
          setIsPlaying(false); // Pause when done
          return 0; // Return to first slide
        }
      });
    }, duration * 1000);
  };

  const stopAutoRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopAutoRotation();
      if (mediaRef.current) {
        mediaRef.current.pause(); // Pause the media element
      }
    } else {
      startAutoRotation();
      if (mediaRef.current) {
        mediaRef.current.play(); // Play the media element
      }
    }
    setIsPlaying((prev) => !prev);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => stopAutoRotation();
  }, []);

  // Sync duration with auto-rotation
  useEffect(() => {
    if (isPlaying) {
      stopAutoRotation();
      startAutoRotation();
    }
  }, [duration]);

  // update media start times
  useEffect(() => {
    const currentStory = stories[currentIndex];
    if ((currentStory?.type === 'video' || currentStory?.type === 'audio') && mediaRef.current) {
      // Set start time when media is loaded
      const handleLoaded = () => {
        if (currentStory.startTime) {
          mediaRef.current.currentTime = currentStory.startTime;
        }
      };
      
      mediaRef.current.addEventListener('loadedmetadata', handleLoaded);
      
      // If media is already loaded, set the start time immediately
      if (mediaRef.current.readyState >= 2 && currentStory.startTime) {
        mediaRef.current.currentTime = currentStory.startTime;
      }
  
      return () => {
        if (mediaRef.current) {
          mediaRef.current.removeEventListener('loadedmetadata', handleLoaded);
        }
      };
    }
  }, [currentIndex, stories]);

  //--------------------------------------------
  // File System Handlers
  //--------------------------------------------
  const ensureDirectory = async () => {
    try {
      await Filesystem.mkdir({
        path: 'stories',
        directory: Directory.Documents,
        recursive: true
      });
    } catch (error) {
      console.log('Directory check:', error);
    }
  };

  //--------------------------------------------
// FFmpeg Load Function
//--------------------------------------------
const loadFFmpeg = async () => {
  try {
    console.log('Starting FFmpeg load...');
    // Remove the progress callback from the load options
    await ffmpeg.load({
      log: true
    });
    console.log('FFmpeg load completed');
    return true;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw new Error(`Failed to load FFmpeg: ${error.message}`);
  }
};

//--------------------------------------------
// Session Handlers
//--------------------------------------------
const handleSaveSession = async () => {
  try {
    setShowProgress(true);
    setProgressMessage('Preparing to export video...');
    setSaveProgress(0);

    if (!ffmpeg.loaded) {
      await loadFFmpeg();
    }

    console.log('Processing media files...');
    const processedFiles = [];

    // Process each media file
    for (let i = 0; i < stories.length; i++) {
      try {
        const story = stories[i];
        console.log(`Starting to process story ${i}:`, story.type);

        if (story.type === 'video') {
          setProgressMessage(`Processing video ${i + 1}/${stories.length}`);
          const inputName = `input${i}.mp4`;
          const outputName = `processed${i}.mp4`;
          
          await ffmpeg.writeFile(inputName, await fetchFile(story.url));
          
          // Fixed video processing to maintain proper speed and audio
          await ffmpeg.exec([
            '-i', inputName,
            '-ss', `${story.startTime || 0}`,
            '-t', `${duration}`,
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-r', '30',  // Force 30fps
            '-preset', 'ultrafast',  // Faster encoding
            '-tune', 'film',  // Better quality for video content
            outputName
          ]);

          processedFiles.push({
            name: outputName,
            type: 'video'
          });
        }
        else if (story.type === 'image') {
          setProgressMessage(`Processing image ${i + 1}/${stories.length}`);
          const inputName = `input${i}.png`;
          const outputName = `processed${i}.mp4`;
          
          await ffmpeg.writeFile(inputName, await fetchFile(story.url));
          
          // Improved image to video conversion
          await ffmpeg.exec([
            '-loop', '1',
            '-i', inputName,
            '-c:v', 'libx264',
            '-t', `${duration}`,
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=1080:1920:force_original_aspect_ratio=1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            '-r', '30',  // Match video fps
            '-preset', 'ultrafast',
            outputName
          ]);

          processedFiles.push({
            name: outputName,
            type: 'video'
          });
        }
        else if (story.type === 'audio') {
          setProgressMessage(`Processing audio ${i + 1}/${stories.length}`);
          const inputName = `input${i}.mp3`;
          const outputName = `processed${i}.mp4`;
          const screenshotName = `audioscreenshot${i}.png`;
          
          // Create a temporary container to render the audio slide
          const tempContainer = document.createElement('div');
          tempContainer.className = 'audio-container';
          tempContainer.style.position = 'fixed';
          tempContainer.style.left = '-9999px';  // Move off-screen
          tempContainer.style.top = 0;
          
          // Add the audio content
          tempContainer.innerHTML = `
            <h3>${story.caption}</h3>
            <audio controls>
              <source src="${story.url}" type="audio/mpeg">
            </audio>
          `;
          
          // Add to document, capture, then remove
          document.body.appendChild(tempContainer);
          
          try {
            console.log(`Capturing screenshot for audio slide ${i} with caption:`, story.caption);
            const canvas = await html2canvas(tempContainer);
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve));
            await ffmpeg.writeFile(screenshotName, await fetchFile(imageBlob));
          } finally {
            // Clean up
            document.body.removeChild(tempContainer);
          }
          
          await ffmpeg.writeFile(inputName, await fetchFile(story.url));
          
          // Rest of your FFmpeg command remains the same
          await ffmpeg.exec([
            '-loop', '1',
            '-i', screenshotName,
            '-i', inputName,
            '-ss', `${story.startTime || 0}`,
            '-t', `${duration}`,
            '-filter_complex', '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v]',
            '-map', '[v]',
            '-map', '1:a',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-shortest',
            '-preset', 'ultrafast',
            outputName
          ]);
        
          processedFiles.push({
            name: outputName,
            type: 'video'
          });
        }
        setSaveProgress((i + 1) / stories.length * 50);
      } catch (error) {
        console.error(`Error processing story ${i}:`, error);
        throw error;
      }
    }

    // Improved concatenation
    if (processedFiles.length > 0) {
      console.log('Creating concat file with:', processedFiles);
      const fileList = processedFiles
        .map(file => `file '${file.name}'`)
        .join('\n');
      
      await ffmpeg.writeFile('list.txt', fileList);

      setProgressMessage('Creating final video...');
      console.log('Starting concatenation...');
      
      // Improved concatenation settings
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-strict', 'experimental',
        '-r', '30',
        '-preset', 'ultrafast',
        '-movflags', '+faststart',
        'final_output.mp4'
      ]);

      const data = await ffmpeg.readFile('final_output.mp4');
      const videoUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
      );

      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'story_export.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(videoUrl);
    }

    setShowProgress(false);
    alert('Export completed! Check the downloaded file.');

  } catch (error) {
    console.error('Export failed:', error);
    setShowProgress(false);
    alert(`Error exporting video: ${error.message}\nCheck console for details.`);
  }
};
  //--------------------------------------------
  // Effect Hooks
  //--------------------------------------------
  useEffect(() => {
    const currentStory = stories[currentIndex];
  
    if (currentStory?.type === 'video' || currentStory?.type === 'audio') {
      const mediaElement = mediaRef.current;
      if (mediaElement) {
        if (isPlaying) {
          mediaElement.play().catch(err => console.log('Autoplay prevented:', err));
        } else {
          mediaElement.pause(); // Ensure media is paused on load
        }
      }
    }
  
    if (currentIndex < stories.length - 1) {
      const nextStory = stories[currentIndex + 1];
      if (nextStory) {
        if (nextStory.type === 'image') {
          const img = new Image();
          img.src = nextStory.url;
        } else if (nextStory.type === 'video' || nextStory.type === 'audio') {
          const media = document.createElement(nextStory.type === 'video' ? 'video' : 'audio');
          media.src = nextStory.url;
          media.preload = 'auto';
        }
      }
    }
  }, [currentIndex, stories, isPlaying]);

  //--------------------------------------------
  // File Upload Handlers
  //--------------------------------------------
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
  
    const newStories = files.map(file => {
      const url = URL.createObjectURL(file);
      const fileType = file.type.split('/')[0];
  
      const wantCaption = window.confirm("Would you like to add a caption? Click OK for yes, Cancel to skip.");
      
      let caption;
      if (wantCaption) {
        caption = prompt("Let's add a caption!", file.name) || file.name;
      } else {
        caption = file.name;
      }
  
      return {
        type: fileType,
        url: url,
        caption: caption,
        duration: fileType === 'audio' || fileType === 'video' ? 0 : undefined
      };
    });
  
    setStories(prevStories => [...prevStories, ...newStories]);
  };

  const processNextFile = () => {
    if (pendingFiles.length === 0) return;
    
    const nextFile = pendingFiles[0];
    setCurrentFile(nextFile);
    setModalOpen(true);
  };

  //--------------------------------------------
  // Caption Handlers
  //--------------------------------------------
  const handleCaptionSubmit = (caption) => {
    const file = currentFile;
    const url = URL.createObjectURL(file);
    const fileType = file.type.split('/')[0];

    const newStory = {
      type: fileType,
      url: url,
      caption: caption || file.name,
      duration: fileType === 'audio' || fileType === 'video' ? 0 : undefined
    };

    setStories(prevStories => [...prevStories, newStory]);
    
    const remainingFiles = pendingFiles.slice(1);
    setPendingFiles(remainingFiles);
    setModalOpen(false);
    
    if (remainingFiles.length > 0) {
      setTimeout(processNextFile, 100);
    }
  };

  const handleModalClose = () => {
    handleCaptionSubmit(currentFile.name);
  };

  //--------------------------------------------
  // Touch Navigation Handlers
  //--------------------------------------------
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < stories.length - 1) {
      handleNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      handlePrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  //--------------------------------------------
  // Navigation Handlers
  //--------------------------------------------
  const handleNext = async () => {
    if (currentIndex < stories.length - 1) {
      await controls.start(
        { opacity: 1 },
        { duration: 0.5 }
      );
      setCurrentIndex(currentIndex + 1);
      controls.set({ opacity: 0 });
      await controls.start(
        { opacity: 1 },
        { duration: 0.5 }
      );
    }
  };
  
  const handlePrevious = async () => {
    if (currentIndex > 0) {
      await controls.start(
        { opacity: 1 },
        { duration: 0.5 }
      );
      setCurrentIndex(currentIndex - 1);
      controls.set({ opacity: 0 });
      await controls.start(
        { opacity: 1 },
        { duration: 0.5 }
      );
    }
  };

  //--------------------------------------------
  // Content Rendering Functions
  //--------------------------------------------
  const renderStoryContent = (story, index) => {
    if (!story || !story.type) {
      console.warn("Skipping rendering: story is undefined or missing type", story);
      return null;
    }
  
    switch (story.type) {
      case 'image':
        return (
          <div className="media-content">
            <img src={story.url} alt={story.caption || "Image"} className="media-content" />
            <div className="caption">{story.caption}</div>
          </div>
        );
      case 'video':
        return (
          <div className="media-content">
            <video
              key={index}
              ref={mediaRef}
              className="media-content"
              controls
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => {
                if (mediaRef.current && story.startTime) {
                  mediaRef.current.currentTime = story.startTime;
                }
              }}
            >
              <source src={story.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="caption">{story.caption}</div>
          </div>
        );
      case 'audio':
        return (
          <div className="audio-container">
            <h3>{story.caption}</h3>
            <audio
              key={index}
              ref={mediaRef}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => {
                if (mediaRef.current && story.startTime) {
                  mediaRef.current.currentTime = story.startTime;
                }
              }}
            >
              <source src={story.url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      default:
        return <p>Unsupported content type</p>;
    }
  };

  //--------------------------------------------
  // Render
  //--------------------------------------------
  return (
    <div className="slider-container">
      {stories.length === 0 ? (
        // Empty state with add content button
        <div className="empty-state">
          <label htmlFor="file-upload" className="file-upload-label">
            <PlusCircle size={48} />
            <span>Add Content</span>
            <input
              type="file"
              id="file-upload"
              accept="image/*,video/*,audio/*"
              multiple
              onChange={handleFileUpload}
              className="hidden-input"
            />
          </label>
        </div>
      ) : (
        // Your existing slider content
        <div 
          className="story-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            className="story-slide"
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ perspective: 1000 }}
          >
            {renderStoryContent(stories[currentIndex], currentIndex)}
          </motion.div>

          <button
            onClick={handlePrevious}
            className="nav-button prev"
            disabled={currentIndex === 0}
          >
            <ChevronLeft />
          </button>

          <button
            onClick={handleNext}
            className="nav-button next"
            disabled={currentIndex === stories.length - 1}
          >
            <ChevronRight />
          </button>

          <div className="progress-container">
            {stories.map((_, index) => (
              <div
                key={index}
                className={`progress-bar ${index === currentIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          <CaptionModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            onSubmit={handleCaptionSubmit}
            fileName={currentFile?.name || ''}
          />

          <ProgressModal
            isOpen={showProgress}
            progress={saveProgress}
            message={progressMessage}
          />
        </div>
      )}

      <BottomMenu 
        onFileUpload={handleFileUpload} 
        onSaveSession={handleSaveSession}
        onPlayPause={handlePlayPause}
        isPlaying={isPlaying}
        duration={duration}
        onDurationChange={setDuration}
        onEdit={() => setShowEditPanel(true)}
      />

      {showEditPanel && (
        <EditPanel
          stories={stories}
          onClose={() => setShowEditPanel(false)}
          onThumbnailClick={(story) => {
            setSelectedStory(story);
            setShowStartPointModal(true);
          }}
        />
      )}

      {showStartPointModal && (
        <StartPointModal
          isOpen={true}
          onClose={() => {
            setShowStartPointModal(false);
            setSelectedStory(null);
          }}
          onSave={handleStartPointSave}
          story={selectedStory}
        />
      )}
    </div>
  );
};

export default StorySlider;