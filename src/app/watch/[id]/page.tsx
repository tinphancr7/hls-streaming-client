"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import VideoPlayer from "@/components/VideoPlayer";
import {videoApi, Video} from "@/lib/api";

export default function WatchPage() {
	const params = useParams();
	const router = useRouter();
	const videoId = params.id as string;

	const [video, setVideo] = useState<Video | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);

	useEffect(() => {
		const loadVideo = async () => {
			try {
				setLoading(true);
				const data = await videoApi.getVideo(videoId);
				setVideo(data);

				// Increment views
				if (data.status === "ready") {
					await videoApi.incrementViews(videoId);
				}

				setError("");
			} catch (err: unknown) {
				console.error("Failed to load video:", err);
				setError("Failed to load video");
			} finally {
				setLoading(false);
			}
		};

		const loadRelatedVideos = async () => {
			try {
				const response = await videoApi.getVideos(1, 8);
				setRelatedVideos(response.videos.filter((v) => v._id !== videoId));
			} catch (error) {
				console.error("Failed to load related videos:", error);
			}
		};

		if (videoId) {
			loadVideo();
			loadRelatedVideos();
		}
	}, [videoId]);

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this video?")) {
			return;
		}

		try {
			await videoApi.deleteVideo(videoId);
			alert("Video deleted successfully");
			router.push("/");
		} catch (err) {
			alert("Failed to delete video");
		}
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatDuration = (seconds: number): string => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		}
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<header className="bg-white dark:bg-gray-800 shadow">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<Link href="/" className="text-2xl font-bold text-blue-600">
							🎬 VideoTube
						</Link>
						<Link
							href="/upload"
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
						>
							Upload Video
						</Link>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-8">
				{error && (
					<div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
						{error}
					</div>
				)}

				{loading ? (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						<p className="mt-4 text-gray-600 dark:text-gray-400">
							Loading video...
						</p>
					</div>
				) : video ? (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Main Video Section */}
						<div className="lg:col-span-2">
							{/* Video Player */}
							{video.status === "ready" && video.hlsPath ? (
								<VideoPlayer
									streamUrl={videoApi.getStreamUrl(video._id)}
									title={video.title}
									className="w-full rounded-lg overflow-hidden"
								/>
							) : video.status === "processing" ? (
								<div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
									<div className="text-center">
										<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
										<p className="text-lg">Processing video...</p>
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
											This may take a few minutes
										</p>
									</div>
								</div>
							) : (
								<div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
									<p className="text-lg text-red-600">
										Failed to process video
									</p>
								</div>
							)}

							{/* Video Info */}
							<div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
								<h1 className="text-2xl font-bold mb-4">{video.title}</h1>

								<div className="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-400">
									<div className="flex items-center gap-4">
										<span>{video.views.toLocaleString()} views</span>
										<span>•</span>
										<span>{formatDate(video.createdAt)}</span>
										{video.duration && video.duration > 0 && (
											<>
												<span>•</span>
												<span>{formatDuration(video.duration)}</span>
											</>
										)}
									</div>
								</div>

								{video.uploadedBy && (
									<div className="mb-4">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											Uploaded by:{" "}
											<span className="font-medium">{video.uploadedBy}</span>
										</span>
									</div>
								)}

								{video.description && (
									<div className="border-t dark:border-gray-700 pt-4">
										<h3 className="font-semibold mb-2">Description</h3>
										<p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
											{video.description}
										</p>
									</div>
								)}

								<div className="border-t dark:border-gray-700 mt-4 pt-4">
									<button
										onClick={handleDelete}
										className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
									>
										Delete Video
									</button>
								</div>
							</div>
						</div>

						{/* Related Videos Sidebar */}
						<div className="lg:col-span-1">
							<h2 className="text-xl font-bold mb-4">Related Videos</h2>
							<div className="space-y-4">
								{relatedVideos.map((relatedVideo) => (
									<Link
										key={relatedVideo._id}
										href={`/watch/${relatedVideo._id}`}
										className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow"
									>
										<div className="w-40 aspect-video bg-gray-200 dark:bg-gray-700 flex-shrink-0 relative">
											{relatedVideo.status === "ready" &&
												relatedVideo.thumbnailPath && (
													<Image
														src={videoApi.getThumbnailUrl(relatedVideo._id)}
														alt={relatedVideo.title}
														fill
														className="object-cover"
													/>
												)}
											{relatedVideo.duration && relatedVideo.duration > 0 && (
												<div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
													{formatDuration(relatedVideo.duration)}
												</div>
											)}
										</div>
										<div className="flex-1 p-2">
											<h3 className="font-semibold text-sm line-clamp-2">
												{relatedVideo.title}
											</h3>
											<p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
												{relatedVideo.views.toLocaleString()} views
											</p>
										</div>
									</Link>
								))}
							</div>
						</div>
					</div>
				) : null}
			</main>
		</div>
	);
}
