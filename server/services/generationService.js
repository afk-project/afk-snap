const { Asset, GenerationJob, sequelize } = require("../models");
const { generateImage, resolveAIMode } = require("./aiService");
const { refund } = require("./creditService");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setProgress(job, progress, io) {
  job.progress = progress;
  job.status = progress === 100 ? "completed" : "processing";
  await job.save();
  const payload = job.toJSON();
  io?.to(`user:${job.userId}`).emit("generation:progress", payload);
  if (job.roomId) io?.to(`room:${job.roomId}`).emit("generation:progress", payload);
}

async function processGeneration(jobId, files, io) {
  const job = await GenerationJob.findByPk(jobId);
  if (!job) return;

  try {
    await setProgress(job, 15, io);
    if (resolveAIMode() === "mock") await wait(650);
    await setProgress(job, 45, io);
    const resultUrl = await generateImage({
      files,
      prompt: job.prompt,
      style: job.style,
      generationType: job.generationType,
      format: job.format,
      layout: job.layout,
      jobId: job.id,
    });
    await setProgress(job, 85, io);
    await Asset.create({
      userId: job.userId,
      roomId: job.roomId,
      generationJobId: job.id,
      kind: "result",
      url: resultUrl,
      mimeType: resultUrl.endsWith(".svg") ? "image/svg+xml" : "image/png",
    });
    job.resultUrl = resultUrl;
    await setProgress(job, 100, io);
    io?.to(`user:${job.userId}`).emit("generation:completed", job.toJSON());
    if (job.roomId) io?.to(`room:${job.roomId}`).emit("generation:completed", job.toJSON());
  } catch (error) {
    await sequelize.transaction(async (transaction) => {
      job.status = "failed";
      job.errorMessage = error.message;
      await job.save({ transaction });
    });
    const wallet = await refund(job.userId, job.cost, job.id);
    io?.to(`user:${job.userId}`).emit("generation:failed", job.toJSON());
    if (wallet) io?.to(`user:${job.userId}`).emit("wallet:updated", { balance: wallet.balance });
    if (job.roomId) io?.to(`room:${job.roomId}`).emit("generation:failed", job.toJSON());
  }
}

module.exports = { processGeneration };
