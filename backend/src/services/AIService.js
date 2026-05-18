const TriageService = require('./TriageService');
const AIDraftService = require('./AIDraftService');
const LLMProvider = require('../providers/LLMProvider');

class JobQueue {
  constructor() {
    this.jobs = new Map();
    this.processing = new Set();
  }

  enqueue(job) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(jobId, {
      id: jobId,
      type: job.type,
      data: job.data,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0
    });
    return jobId;
  }

  dequeue() {
    for (const [id, job] of this.jobs) {
      if (job.status === 'pending' && !this.processing.has(id)) {
        return id;
      }
    }
    return null;
  }

  async process(jobId, processor) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    this.processing.add(jobId);
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const result = await processor(job);
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      return result;
    } catch (error) {
      job.attempts++;
      job.lastError = error.message;
      if (job.attempts >= (job.maxAttempts || 3)) {
        job.status = 'failed';
      } else {
        job.status = 'pending';
      }
      throw error;
    } finally {
      this.processing.delete(jobId);
    }
  }

  getStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  listPending() {
    return Array.from(this.jobs.values()).filter(j => j.status === 'pending');
  }
}

class AIProcessingService {
  constructor({ triageService, aiDraftService, jobQueue, conversationRepository }) {
    this.triageService = triageService;
    this.aiDraftService = aiDraftService;
    this.jobQueue = jobQueue;
    this.conversationRepository = conversationRepository;
  }

  enqueueTriage(conversationId) {
    return this.jobQueue.enqueue({
      type: 'triage',
      data: { conversationId }
    });
  }

  enqueueDraft(conversationId) {
    return this.jobQueue.enqueue({
      type: 'generate_draft',
      data: { conversationId }
    });
  }

  enqueueFullProcessing(conversationId) {
    const triageJobId = this.enqueueTriage(conversationId);
    const draftJobId = this.enqueueDraft(conversationId);
    return { triageJobId, draftJobId };
  }

  async processTriageJob(job) {
    const { conversationId } = job.data;
    return this.triageService.triage(conversationId);
  }

  async processDraftJob(job) {
    const { conversationId } = job.data;
    return this.aiDraftService.generateDraft(conversationId);
  }

  async processJob(jobId) {
    const job = this.jobQueue.getStatus(jobId);
    if (!job) return null;

    if (job.type === 'triage') {
      return this.jobQueue.process(jobId, (j) => this.processTriageJob(j));
    }
    if (job.type === 'generate_draft') {
      return this.jobQueue.process(jobId, (j) => this.processDraftJob(j));
    }

    throw new Error(`Unknown job type: ${job.type}`);
  }

  async processAll() {
    const results = [];
    let jobId;
    while ((jobId = this.jobQueue.dequeue())) {
      try {
        const result = await this.processJob(jobId);
        results.push({ jobId, success: true, result });
      } catch (error) {
        results.push({ jobId, success: false, error: error.message });
      }
    }
    return results;
  }
}

function createAIServiceContainer(container) {
  const llmProvider = new LLMProvider();
  const jobQueue = new JobQueue();

  const triageService = new TriageService({
    llmProvider,
    conversationRepository: container.repositories.conversation,
    messageRepository: container.repositories.message
  });

  const aiDraftService = new AIDraftService({
    llmProvider,
    conversationRepository: container.repositories.conversation,
    messageRepository: container.repositories.message,
    departmentRepository: container.repositories.department
  });

  const aiProcessingService = new AIProcessingService({
    triageService,
    aiDraftService,
    jobQueue,
    conversationRepository: container.repositories.conversation
  });

  return {
    llmProvider,
    jobQueue,
    triageService,
    aiDraftService,
    aiProcessingService
  };
}

module.exports = {
  JobQueue,
  AIProcessingService,
  createAIServiceContainer
};