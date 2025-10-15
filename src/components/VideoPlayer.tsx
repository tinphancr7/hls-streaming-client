"use client";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {MediaPlayer, MediaProvider} from "@vidstack/react";
import {
	DefaultVideoLayout,
	defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

interface VideoPlayerProps {
	streamUrl: string;
	title?: string;
	className?: string;
}

export default function VideoPlayer({
	streamUrl,
	title = "Video",
	className = "",
}: VideoPlayerProps) {
	console.log("VideoPlayer rendered", streamUrl);
	return (
		<div className={className}>
			<MediaPlayer
				src={{
					src: streamUrl,
					type: "application/x-mpegurl", // HLS stream
				}}
				viewType="video"
				streamType="on-demand"
				logLevel="warn"
				crossOrigin
				playsInline
				title={title}
				aspectRatio="16/9"
			>
				<MediaProvider />
				<DefaultVideoLayout icons={defaultLayoutIcons} />
			</MediaPlayer>
		</div>
	);
}
