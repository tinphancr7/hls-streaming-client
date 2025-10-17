# Chunked File Upload System

This React frontend implements a robust chunked file upload system that allows efficient uploading of large video files by splitting them into smaller chunks.

## Features

### 🔄 **Multiple Upload Methods**

- **Standard Upload**: Traditional single-file upload (recommended for files < 100MB)
- **Chunked Upload**: Manual implementation with progress tracking
- **Chunked Upload with Hook**: Reusable custom hook implementation (recommended)

### 📊 **Advanced Progress Tracking**

- Real-time upload progress with percentage
- Upload speed calculation (MB/s)
- Estimated time remaining
- Chunk-by-chunk progress indication
- File size formatting and validation

### 🛡️ **Robust Error Handling**

- Upload cancellation support
- Network error recovery
- File validation (type and size)
- Comprehensive error messages

### ⚡ **Performance Optimizations**

- Configurable chunk size (default: 10MB)
- Sequential chunk uploading
- Abort controller for cancellation
- Memory-efficient file processing

## How It Works

### 1. **File Chunking Process**

```
Large Video File (1GB)
       ↓
Split into chunks (10MB each)
       ↓
100 chunks total
       ↓
Upload sequentially with progress tracking
```

### 2. **Upload Flow**

1. **File Selection**: User selects a video file
2. **Validation**: Check file type and size limits
3. **Chunking**: Calculate total chunks needed
4. **Sequential Upload**: Upload chunks one by one
5. **Progress Updates**: Real-time progress tracking
6. **Finalization**: Merge chunks on backend
7. **Processing**: Video processing begins

### 3. **Backend Integration**

The frontend expects these backend endpoints:

```typescript
POST /videos/upload-chunk
// Upload individual chunk
{
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  uploadId: string,
  fileName: string
}

POST /videos/finalize-upload
// Finalize upload and create video record
{
  uploadId: string,
  title: string,
  description?: string,
  uploadedBy?: string,
  fileName: string,
  fileSize: number
}
```

## Components

### 1. **ChunkedUploadForm.tsx**

Manual implementation with built-in chunk upload logic.

**Features:**

- Direct fetch API calls
- Built-in progress calculation
- File validation and error handling
- Upload cancellation

### 2. **ChunkedUploadFormSimple.tsx**

Simplified component using the custom hook.

**Features:**

- Clean separation of concerns
- Reusable upload logic
- Easier to maintain and test

### 3. **useChunkedUpload Hook**

Reusable hook for chunked upload functionality.

**API:**

```typescript
const {
	uploading, // boolean: Upload in progress
	progress, // UploadProgress: Detailed progress info
	currentChunk, // number: Current chunk being uploaded
	totalChunks, // number: Total chunks for the file
	error, // string | null: Error message
	uploadFile, // Function: Start upload
	cancelUpload, // Function: Cancel upload
	resetUpload, // Function: Reset state
} = useChunkedUpload({
	chunkSize: 10 * 1024 * 1024, // 10MB
	apiUrl: "http://localhost:3000/api",
});
```

## Configuration

### Chunk Size

Default: 10MB chunks

- Smaller chunks: More resilient to network issues, more requests
- Larger chunks: Fewer requests, less resilient to network issues

```typescript
const {uploadFile} = useChunkedUpload({
	chunkSize: 5 * 1024 * 1024, // 5MB chunks
});
```

### File Validation

- **Type validation**: Only video files allowed
- **Size limits**: Configurable max file size (default: 5GB)
- **Format support**: All video formats supported by HTML5

## Usage Examples

### Basic Usage with Hook

```typescript
import {useChunkedUpload} from "@/hooks/useChunkedUpload";

function MyUploadComponent() {
	const {uploadFile, uploading, progress} = useChunkedUpload();

	const handleUpload = async (file: File) => {
		try {
			await uploadFile(file, {
				title: "My Video",
				description: "Video description",
			});
			console.log("Upload successful!");
		} catch (error) {
			console.error("Upload failed:", error);
		}
	};

	return (
		<div>
			{uploading && <div>Progress: {progress.percentage}%</div>}
			{/* Upload UI */}
		</div>
	);
}
```

### Progress Display

```typescript
{
	uploading && (
		<div>
			<div>
				Chunk {currentChunk} of {totalChunks}
			</div>
			<div>Progress: {progress.percentage}%</div>
			<div>Speed: {formatBytes(progress.speed)}/s</div>
			<div>Time remaining: {formatTime(progress.timeRemaining)}</div>
		</div>
	);
}
```

## Benefits

### 🚀 **Performance**

- Large files can be uploaded reliably
- Network interruptions don't require full restart
- Better user experience with detailed progress

### 🔧 **Reliability**

- Automatic retry capability (can be added)
- Upload resumption support (can be implemented)
- Better error handling and recovery

### 📱 **User Experience**

- Real-time progress feedback
- Upload cancellation
- Speed and time estimation
- File validation with helpful messages

## File Structure

```
src/
├── components/
│   ├── ChunkedUploadForm.tsx           # Manual implementation
│   ├── ChunkedUploadFormSimple.tsx     # Hook-based implementation
│   └── UploadForm.tsx                  # Standard upload
├── hooks/
│   └── useChunkedUpload.ts             # Reusable upload hook
├── lib/
│   └── api.ts                          # API functions
└── app/
    └── upload/
        └── page.tsx                    # Upload page with all methods
```

## Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- Requires: File API, Fetch API, FormData support

## Future Enhancements

- [ ] Upload resumption after network failure
- [ ] Parallel chunk uploading
- [ ] Automatic retry with exponential backoff
- [ ] Drag & drop file upload
- [ ] Multiple file selection
- [ ] Upload queue management
- [ ] Background upload with service worker
