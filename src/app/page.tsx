"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import VideoCard from "@/components/VideoCard";
import {videoApi, Video} from "@/lib/api";

export default function Home() {
	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		const loadVideos = async () => {
			try {
				setLoading(true);
				const response = search.trim()
					? await videoApi.searchVideos(search.trim(), page, 20)
					: await videoApi.getVideos(page, 20);
				setVideos(response.videos);
				setTotalPages(response.totalPages);
				setError("");
			} catch (err: unknown) {
				console.error("Failed to load videos:", err);
				setError("Failed to load videos. Make sure the server is running.");
			} finally {
				setLoading(false);
			}
		};

		loadVideos();
	}, [page, search]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setPage(1);
		// The useEffect will automatically trigger loadVideos when search or page changes
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

			{/* Search Bar */}
			<div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
				<div className="container mx-auto px-4 py-4">
					<form onSubmit={handleSearch} className="max-w-2xl mx-auto">
						<div className="flex gap-2">
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search videos..."
								className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
							/>
							<button
								type="submit"
								className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
							>
								Search
							</button>
						</div>
					</form>
				</div>
			</div>

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
							Loading videos...
						</p>
					</div>
				) : videos.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
							No videos found
						</p>
						<Link
							href="/upload"
							className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
						>
							Upload Your First Video
						</Link>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{videos.map((video) => (
								<VideoCard key={video._id} video={video} />
							))}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="mt-8 flex justify-center gap-2">
								<button
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								<span className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
									Page {page} of {totalPages}
								</span>
								<button
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
}
