import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { VideoService } from './video.service';
import type { Video } from '../schemas/video.schema';
import * as path from 'path';
import * as fs from 'fs';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body('chunkIndex') chunkIndex: string,
    @Body('filename') filename: string,
    @Body('totalChunks') totalChunks: string,
    @Body('totalSize') totalSize: string,
    @Body('title') title: string,
    @Body('description') description?: string,
  ): Promise<{
    success: boolean;
    uploadId: string;
    videoId?: string;
    uploadedChunks: number[];
    isComplete: boolean;
    message: string;
  }> {
    if (!file) {
      throw new BadRequestException('No chunk file provided');
    }

    if (
      !filename ||
      !title ||
      !totalChunks ||
      !totalSize ||
      chunkIndex === undefined
    ) {
      throw new BadRequestException(
        'filename, title, totalChunks, totalSize, and chunkIndex are required',
      );
    }

    const chunkIdx = parseInt(chunkIndex, 10);
    if (isNaN(chunkIdx)) {
      throw new BadRequestException('Invalid chunk index');
    }

    // Find existing upload session or create new one
    let video = await this.videoService.findUploadByMetadata(
      filename,
      parseInt(totalChunks, 10),
      parseInt(totalSize, 10),
      title,
    );

    if (!video) {
      // Create new upload session
      video = await this.videoService.initializeChunkedUpload(
        filename,
        parseInt(totalChunks, 10),
        parseInt(totalSize, 10),
        title,
        description,
      );
    }

    const result = await this.videoService.uploadChunk(
      video.uploadId,
      chunkIdx,
      file,
    );

    return {
      ...result,
      uploadId: video.uploadId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      videoId: String((video as any)._id),
      message: result.isComplete
        ? 'All chunks uploaded successfully. Processing video...'
        : `Chunk ${chunkIdx} uploaded successfully`,
    };
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{
    videos: Video[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await this.videoService.findAll(pageNum, limitNum);

    return {
      ...result,
      page: pageNum,
      totalPages: Math.ceil(result.total / limitNum),
    };
  }

  @Get('search')
  async searchVideos(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{
    videos: Video[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await this.videoService.searchVideos(
      query,
      pageNum,
      limitNum,
    );

    return {
      ...result,
      page: pageNum,
      totalPages: Math.ceil(result.total / limitNum),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Video> {
    return this.videoService.findOne(id);
  }

  @Post(':id/view')
  async incrementViews(@Param('id') id: string): Promise<Video> {
    return this.videoService.incrementViews(id);
  }

  @Get(':id/stream')
  async streamVideo(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const video = await this.videoService.findOne(id);

    if (!video.hlsPath || !fs.existsSync(video.hlsPath)) {
      throw new NotFoundException('Video stream not available');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');

    const stream = fs.createReadStream(video.hlsPath);
    stream.pipe(res);
  }

  @Get(':id/segments/:segment')
  async getSegment(
    @Param('id') id: string,
    @Param('segment') segment: string,
    @Res() res: Response,
  ): Promise<void> {
    console.log('getSegment2', id, segment);

    // Decode the segment parameter to handle special characters
    let decodedSegment: string;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch (error) {
      console.error('Failed to decode segment parameter:', segment, error);
      throw new BadRequestException('Invalid segment parameter');
    }

    const video = await this.videoService.findOne(id);

    if (!video.hlsPath) {
      throw new NotFoundException('Video not found');
    }

    const segmentPath = path.join(path.dirname(video.hlsPath), decodedSegment);

    if (!fs.existsSync(segmentPath)) {
      throw new NotFoundException('Segment not found');
    }

    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = fs.createReadStream(segmentPath);
    stream.pipe(res);
  }

  @Get(':videoId/:segment')
  async getSegmentDirect(
    @Param('videoId') videoId: string,
    @Param('segment') segment: string,
    @Res() res: Response,
  ): Promise<void> {
    console.log('getSegmentDirect', videoId, segment);

    // Decode the segment parameter to handle special characters
    let decodedSegment: string;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch (error) {
      console.error('Failed to decode segment parameter:', segment, error);
      throw new BadRequestException('Invalid segment parameter');
    }

    // Only handle .ts files (HLS segments)
    if (!decodedSegment.endsWith('.ts')) {
      throw new NotFoundException('Segment not found');
    }

    const video = await this.videoService.findOne(videoId);

    if (!video.hlsPath) {
      throw new NotFoundException('Video not found');
    }

    const segmentPath = path.join(path.dirname(video.hlsPath), decodedSegment);

    if (!fs.existsSync(segmentPath)) {
      throw new NotFoundException('Segment not found');
    }

    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = fs.createReadStream(segmentPath);
    stream.pipe(res);
  }

  @Get(':id/thumbnail')
  async getThumbnail(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const video = await this.videoService.findOne(id);

    if (!video.thumbnailPath || !fs.existsSync(video.thumbnailPath)) {
      throw new NotFoundException('Thumbnail not available');
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = fs.createReadStream(video.thumbnailPath);
    stream.pipe(res);
  }

  @Put(':id')
  async updateVideo(
    @Param('id') id: string,
    @Body() updateData: Record<string, any>,
  ): Promise<Video> {
    // Remove fields that shouldn't be updated directly
    const restrictedFields = [
      '_id',
      'createdAt',
      'updatedAt',
      'originalPath',
      'hlsPath',
      'thumbnailPath',
    ];

    const allowedUpdates = Object.keys(updateData)
      .filter((key) => !restrictedFields.includes(key))
      .reduce(
        (obj, key) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          obj[key] = updateData[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    return this.videoService.updateVideo(id, allowedUpdates as Partial<Video>);
  }

  @Delete(':id')
  async deleteVideo(@Param('id') id: string): Promise<{ message: string }> {
    await this.videoService.deleteVideo(id);
    return { message: 'Video deleted successfully' };
  }

  // Upload status and management endpoints

  @Get('upload/status/:uploadId')
  async getChunkUploadStatus(@Param('uploadId') uploadId: string): Promise<{
    video: Video;
    progress: number;
    missingChunks: number[];
  }> {
    const video = await this.videoService.getUploadStatus(uploadId);
    const missingChunks = await this.videoService.getMissingChunks(uploadId);

    const progress =
      video.totalChunks > 0
        ? (video.uploadedChunks.length / video.totalChunks) * 100
        : 0;

    return {
      video,
      progress: Math.round(progress * 100) / 100,
      missingChunks,
    };
  }

  @Get('upload/missing-chunks/:uploadId')
  async getMissingChunks(@Param('uploadId') uploadId: string): Promise<{
    missingChunks: number[];
    totalChunks: number;
    uploadedChunks: number;
  }> {
    const video = await this.videoService.getUploadStatus(uploadId);
    const missingChunks = await this.videoService.getMissingChunks(uploadId);

    return {
      missingChunks,
      totalChunks: video.totalChunks,
      uploadedChunks: video.uploadedChunks.length,
    };
  }

  @Delete('upload/cancel/:uploadId')
  async cancelChunkUpload(@Param('uploadId') uploadId: string): Promise<{
    message: string;
  }> {
    await this.videoService.cancelUpload(uploadId);

    return {
      message: 'Upload cancelled successfully',
    };
  }

  @Post('upload/retry/:uploadId')
  async retryChunkUpload(@Param('uploadId') uploadId: string): Promise<{
    missingChunks: number[];
    message: string;
  }> {
    const video = await this.videoService.getUploadStatus(uploadId);

    if (video.status === 'ready') {
      throw new BadRequestException('Upload already completed');
    }

    if (video.status === 'merging') {
      throw new BadRequestException('Upload is currently being processed');
    }

    const missingChunks = await this.videoService.getMissingChunks(uploadId);

    return {
      missingChunks,
      message: `Found ${missingChunks.length} missing chunks. Please re-upload them.`,
    };
  }

  @Post('upload/cleanup-expired')
  async cleanupExpiredUploads(): Promise<{ message: string }> {
    await this.videoService.cleanupExpiredUploads();

    return {
      message: 'Expired uploads cleaned up successfully',
    };
  }
}
