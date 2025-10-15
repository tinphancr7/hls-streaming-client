"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
	const router = useRouter();

	const handleUploadSuccess = () => {
		setTimeout(() => {
			router.push("/");
		}, 2000);
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
							href="/"
							className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
						>
							Back to Home
						</Link>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-8 max-w-3xl">
				<UploadForm onUploadSuccess={handleUploadSuccess} />
			</main>
		</div>
	);
}
