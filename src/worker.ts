type WorkerEnvironment = {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  DB: unknown;
};

export default {
  async fetch(request: Request, environment: WorkerEnvironment) {
    return environment.ASSETS.fetch(request);
  },
};