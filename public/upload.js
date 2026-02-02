(() => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const processing = document.getElementById('processing');
  const errorMsg = document.getElementById('errorMsg');

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_SIZE = 20 * 1024 * 1024;

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('is-visible');
    setTimeout(() => errorMsg.classList.remove('is-visible'), 5000);
  }

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return false;
    }
    if (file.size > MAX_SIZE) {
      showError('File too large. Maximum size is 20 MB.');
      return false;
    }
    return true;
  }

  async function uploadFile(file) {
    if (!validateFile(file)) return;

    // Show processing state
    dropzone.style.display = 'none';
    processing.classList.add('is-visible');
    errorMsg.classList.remove('is-visible');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Redirect to viewer
      window.location.href = data.url;
    } catch (err) {
      dropzone.style.display = '';
      processing.classList.remove('is-visible');
      showError(err.message || 'Something went wrong. Please try again.');
    }
  }

  // Drag and drop
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('upload-dropzone--active');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('upload-dropzone--active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  });

  // Click to browse
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) uploadFile(file);
  });
})();
