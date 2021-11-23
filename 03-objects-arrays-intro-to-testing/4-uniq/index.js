/**
 * uniq - returns array of uniq values:
 * @param {*[]} arr - the array of primitive values
 * @returns {*[]} - the new array with uniq values
 */
export function uniq(arr) {
  const uniqSet = new Set(arr);
  const uniqArr = [];

  for (let value of uniqSet) {
    uniqArr.push(value);
  }

  return uniqArr;
}
