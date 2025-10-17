import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface Video {
	_id: string;
	title: string;
	description?: string;
	originalPath: string;
	hlsPath?: string;
	thumbnailPath?: string;
	duration?: number;
	views: number;
	uploadedBy?: string;
	status: "processing" | "ready" | "failed";
	createdAt: string;
	updatedAt: string;
}

export interface VideosResponse {
	videos: Video[];
	total: number;
	page: number;
	totalPages: number;
}

const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

export const videoApi = {
	// Upload video
	uploadVideo: async (
		file: File,
		title: string,
		description?: string
	): Promise<Video> => {
		const formData = new FormData();
		formData.append("video", file);
		formData.append("title", title);
		if (description) {
			formData.append("description", description);
		}

		const response = await api.post<Video>("/videos/upload", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});
		return response.data;
	},

	// Get all videos
	getVideos: async (
		page: number = 1,
		limit: number = 10
	): Promise<VideosResponse> => {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString(),
		});
		const response = await api.get<VideosResponse>(`/videos?${params}`);
		return response.data;
	},

	// Search videos
	searchVideos: async (
		query: string,
		page: number = 1,
		limit: number = 10
	): Promise<VideosResponse> => {
		const params = new URLSearchParams({
			q: query,
			page: page.toString(),
			limit: limit.toString(),
		});
		const response = await api.get<VideosResponse>(`/videos/search?${params}`);
		return response.data;
	},

	// Get single video
	getVideo: async (id: string): Promise<Video> => {
		const response = await api.get<Video>(`/videos/${id}`);
		return response.data;
	},

	// Update video
	updateVideo: async (
		id: string,
		data: {title?: string; description?: string}
	): Promise<Video> => {
		const response = await api.put<Video>(`/videos/${id}`, data);
		return response.data;
	},

	// Delete video
	deleteVideo: async (id: string): Promise<{message: string}> => {
		const response = await api.delete<{message: string}>(`/videos/${id}`);
		return response.data;
	},

	// Increment views
	incrementViews: async (id: string): Promise<Video> => {
		const response = await api.post<Video>(`/videos/${id}/view`);
		return response.data;
	},

	// Get stream URL (HLS master playlist)
	getStreamUrl: (videoId: string): string => {
		return `${API_URL}/videos/${videoId}/stream`;
	},

	// Get thumbnail URL
	getThumbnailUrl: (videoId: string): string => {
		return `${API_URL}/videos/${videoId}/thumbnail`;
	},

	// Get HLS segment URL
	getSegmentUrl: (videoId: string, segmentName: string): string => {
		return `${API_URL}/videos/${videoId}/segments/${segmentName}`;
	},

	// Chunked upload - initialize upload session
	initializeChunkedUpload: async (
		filename: string,
		totalChunks: number,
		totalSize: number,
		title: string,
		description?: string
	): Promise<{uploadId: string; message: string}> => {
		const response = await api.post<{uploadId: string; message: string}>(
			"/chunk-upload/initialize",
			{
				filename,
				totalChunks,
				totalSize,
				title,
				description,
			}
		);
		return response.data;
	},

	// Chunked upload - upload a single chunk
	uploadChunk: async (
		uploadId: string,
		chunkIndex: number,
		chunk: Blob
	): Promise<{
		success: boolean;
		uploadedChunks: number[];
		isComplete: boolean;
		message: string;
	}> => {
		const formData = new FormData();
		formData.append("chunk", chunk);
		formData.append("uploadId", uploadId);
		formData.append("chunkIndex", chunkIndex.toString());

		const response = await api.post<{
			success: boolean;
			uploadedChunks: number[];
			isComplete: boolean;
			message: string;
		}>("/chunk-upload/chunk", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});
		return response.data;
	},

	// Get upload status
	getChunkedUploadStatus: async (
		uploadId: string
	): Promise<{
		upload: unknown;
		progress: number;
		missingChunks: number[];
	}> => {
		const response = await api.get<{
			upload: unknown;
			progress: number;
			missingChunks: number[];
		}>(`/chunk-upload/status/${uploadId}`);
		return response.data;
	},

	// Retry upload - get missing chunks
	retryChunkedUpload: async (
		uploadId: string
	): Promise<{
		missingChunks: number[];
		message: string;
	}> => {
		const response = await api.post<{
			missingChunks: number[];
			message: string;
		}>(`/chunk-upload/retry/${uploadId}`);
		return response.data;
	},

	// Cancel upload
	cancelChunkedUpload: async (uploadId: string): Promise<{message: string}> => {
		const response = await api.delete<{message: string}>(
			`/chunk-upload/cancel/${uploadId}`
		);
		return response.data;
	},
};
