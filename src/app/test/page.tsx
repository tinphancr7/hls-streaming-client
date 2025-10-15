"use client";
import React from "react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {MediaPlayer, MediaProvider, Poster, Track} from "@vidstack/react";
import {
	DefaultVideoLayout,
	defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

const textTracks = [
	{
		src: "https://files.vidstack.io/sprite-fight/subs/english.vtt",
		label: "English",
		language: "en-US",
		kind: "subtitles",
		type: "vtt",
		default: true,
	},
	{
		src: "https://files.vidstack.io/sprite-fight/subs/spanish.vtt",
		label: "Spanish",
		language: "es-ES",
		kind: "subtitles",
		type: "vtt",
	},
	{
		src: "https://files.vidstack.io/sprite-fight/chapters.vtt",
		language: "en-US",
		kind: "chapters",
		type: "vtt",
		default: true,
	},
];
const PageTest = () => {
	return (
		<div className="w-[500px] h-[500px]">
			<MediaPlayer
				src="https://files.vidstack.io/sprite-fight/720p.mp4"
				viewType="video"
				streamType="on-demand"
				logLevel="warn"
				crossOrigin
				playsInline
				title="Sprite Fight"
				poster="https://files.vidstack.io/sprite-fight/poster.webp"
			>
				<MediaProvider>
					<Poster className="vds-poster" />
					{textTracks.map((track) => (
						<Track {...track} key={track.src} />
					))}
				</MediaProvider>
				<DefaultVideoLayout
					thumbnails="https://files.vidstack.io/sprite-fight/thumbnails.vtt"
					icons={defaultLayoutIcons}
				/>
			</MediaPlayer>
		</div>
	);
};

export default PageTest;
