/**
 * Async Sleep.
 *
 * @private
 * @param delay - The time, in milliseconds, to wait.
 */
export const sleep = (delay: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};
