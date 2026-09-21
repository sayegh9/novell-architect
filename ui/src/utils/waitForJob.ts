export interface JobStatus {
  is_running: boolean;
  cmd: string;
  returncode: number | null;
}

const defaultPause = () => new Promise<void>((resolve) => {
  window.setTimeout(resolve, 1000);
});

export async function waitForJobCompletion(
  expectedCmd: string,
  fetchStatus: () => Promise<JobStatus>,
  pause: () => Promise<void> = defaultPause,
  maxAttempts = 600,
): Promise<JobStatus> {
  let observedRunning = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await fetchStatus();

    if (status.cmd === expectedCmd && status.is_running) {
      observedRunning = true;
    }

    const isCompletedExpectedJob = status.cmd === expectedCmd
      && !status.is_running
      && (observedRunning || status.returncode !== null);

    if (isCompletedExpectedJob) {
      if (status.returncode !== 0) {
        throw new Error(`Background action failed with exit code ${status.returncode}`);
      }
      return status;
    }

    await pause();
  }

  throw new Error(`Timed out waiting for background action: ${expectedCmd}`);
}
