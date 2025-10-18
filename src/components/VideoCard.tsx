"use client";

import Link from "next/link";
import {Video, videoApi} from "@/lib/api";
import Image from "next/image";

interface VideoCardProps {
	video: Video;
}

function formatDuration(seconds: number): string {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	}
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatViews(views: number): string {
	if (views >= 1000000) {
		return `${(views / 1000000).toFixed(1)}M`;
	}
	if (views >= 1000) {
		return `${(views / 1000).toFixed(1)}K`;
	}
	return views.toString();
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
	return `${Math.floor(diffDays / 365)} years ago`;
}

export default function VideoCard({video}: VideoCardProps) {
	const thumbnailUrl = video.thumbnailPath
		? videoApi.getThumbnailUrl(video._id)
		: null;
	console.log("Thumbnail URL:", thumbnailUrl);

	return (
		<Link href={`/watch/${video._id}`} className="block group">
			<div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
				{/* Video Preview */}
				<div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800">
					{thumbnailUrl ? (
						<Image
							src={thumbnailUrl}
							alt={video.title}
							fill
							className="object-cover"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center text-white">
							{video.status === "processing" ? (
								<div className="text-center">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2 mx-auto"></div>
									<span>Processing...</span>
								</div>
							) : (
								<svg
									className="w-20 h-20"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
								</svg>
							)}
						</div>
					)}
					{video.duration && video.duration > 0 && (
						<div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
							{formatDuration(video.duration)}
						</div>
					)}
				</div>

				{/* Video Info */}
				<div className="p-4">
					<h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
						{video.title}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
						{formatViews(video.views)} views • {formatDate(video.createdAt)}
					</p>
					{video.uploadedBy && (
						<p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
							by {video.uploadedBy}
						</p>
					)}
				</div>
			</div>
		</Link>
	);
}
