/**
 * Promise에 타임아웃을 적용
 * @param {Promise} promise
 * @param {number} ms - 밀리초
 * @param {string} [label] - 타임아웃 오류 메시지용 라벨
 * @returns {Promise}
 */
export function withTimeout(promise, ms, label = 'Operation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
