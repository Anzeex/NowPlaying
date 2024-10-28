const hash = window.location.hash
  .substring(1)
  .split('&')
  .reduce(function (initial, item) {
    if (item) {
      var parts = item.split('=');
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});
window.location.hash = '';

let access_token = hash.access_token || localStorage.getItem('access_token');
let refresh_token = hash.refresh_token || localStorage.getItem('refresh_token');

const loginButton = document.getElementById('login-button');
const nowPlaying = document.getElementById('now-playing');
const songName = document.getElementById('song-name');
const artistName = document.getElementById('artist-name');
const albumCover = document.getElementById('album-cover');

const currentTime = document.getElementById('current-time');
const totalTime = document.getElementById('total-time');
const progress = document.getElementById('progress');
let totalDuration = 0;
let progressInterval = null;
let isPlaying = true; 

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function updateProgressBar(current, total) {
  const progressPercent = (current / total) * 100;
  progress.style.width = progressPercent + '%';
}

function updateNowPlaying() {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            Authorization: 'Bearer ' + access_token,
        },
    })
        .then((response) => {
            if (response.status === 204 || response.status > 400) {
                songName.innerText = 'Not playing anything right now.';
                artistName.innerText = ''; // Clear artist name
                albumCover.style.display = 'none';
                document.getElementById('playback-info').style.display = 'none';
                progress.style.width = '0%';
                currentTime.innerText = '0:00';
                totalTime.innerText = '0:00';
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
                document.body.style.setProperty('--background-image', '');
            } else {
                return response.json();
            }
        })
        .then((data) => {
            if (data && data.item) {
                songName.innerText = data.item.name;
                const artists = data.item.artists.map((artist) => artist.name).join(', ');
                artistName.innerText = artists;
                albumCover.src = data.item.album.images[0].url;
                albumCover.style.display = 'block';
                document.getElementById('playback-info').style.display = 'flex';

                const albumCoverUrl = data.item.album.images[0].url;
                document.body.style.setProperty('--background-image', `url(${albumCoverUrl})`);

                const duration_ms = data.item.duration_ms;
                totalDuration = duration_ms; 
                totalTime.innerText = formatTime(duration_ms);

                let progress_ms = data.progress_ms;
                currentTime.innerText = formatTime(progress_ms);
                updateProgressBar(progress_ms, duration_ms);

                isPlaying = data.is_playing;

                if (progressInterval) {
                    clearInterval(progressInterval);
                }

                if (isPlaying) {
                    progressInterval = setInterval(() => {
                        progress_ms += 1000;
                        if (progress_ms > duration_ms) {
                            progress_ms = duration_ms;
                            clearInterval(progressInterval);
                        }
                        currentTime.innerText = formatTime(progress_ms);
                        updateProgressBar(progress_ms, duration_ms);
                    }, 1000);
                }
            }
        })
        .catch((error) => {
            console.error(error);
            if (error.status === 401) {
                refreshAccessToken();
            }
        });
}

function refreshAccessToken() {
  fetch('/refresh_token?refresh_token=' + refresh_token)
    .then((response) => response.json())
    .then((data) => {
      access_token = data.access_token;
      localStorage.setItem('access_token', access_token);
      updateNowPlaying();
    })
    .catch((error) => {
      console.error('Failed to refresh access token', error);
    });
}

if (!access_token) {
  loginButton.style.display = 'block';
  nowPlaying.style.display = 'none';
  loginButton.addEventListener('click', () => {
    window.location = '/login';
  });
} else {
  loginButton.style.display = 'none';
  nowPlaying.style.display = 'block';
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);
  updateNowPlaying();
  setInterval(updateNowPlaying, 5000);
}
