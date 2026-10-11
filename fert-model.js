/* The small examples in the framework are illustrative, with the paper's rules. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FertModel = factory();
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';

  function align(query, candidate) {
    if (!query.length || candidate.length < query.length) return null;
    const width = candidate.length;
    const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
    const costs = Array.from({length:query.length}, () => Array(width).fill(Infinity));
    const predecessors = Array.from({length:query.length}, () => Array(width).fill(-1));
    costs[0] = candidate.map(frame => distance(query[0], frame));
    for (let i = 1; i < query.length; i++) {
      for (let j = 1; j < width; j++) {
        const previous = j > 1 && costs[i - 1][j - 2] < costs[i - 1][j - 1] ? j - 2 : j - 1;
        costs[i][j] = distance(query[i], candidate[j]) + costs[i - 1][previous];
        predecessors[i][j] = previous;
      }
    }
    const final = costs[costs.length - 1];
    const end = final.indexOf(Math.min(...final));
    if (!Number.isFinite(final[end])) return null;
    const path = Array(query.length);
    let cursor = end;
    for (let i = path.length - 1; i >= 0; i--) {
      path[i] = cursor;
      cursor = predecessors[i][cursor];
    }
    return {path, cost:final[end] / query.length, interval:[path[0], path[path.length - 1] + 1]};
  }

  function updatePriorities(priorities, intervals, retention, horizon) {
    return priorities.map((weights, trajectory) => weights.map((weight, start) => {
      const overlap = intervals.filter(interval => interval.trajectory === trajectory).reduce(
        (sum, interval) => sum + Math.max(0, Math.min(start + horizon, interval.end) - Math.max(start, interval.start)) / horizon, 0
      );
      return retention * weight + overlap;
    }));
  }

  function probabilities(priorities) {
    const total = priorities.flat().reduce((sum, weight) => sum + weight, 0);
    if (!(total > 0)) return priorities.map(row => row.map(() => 0));
    return priorities.map(row => row.map(weight => weight / total));
  }

  function sample(probability, value) {
    let sum = 0;
    let last = null;
    for (let trajectory = 0; trajectory < probability.length; trajectory++) {
      for (let chunk = 0; chunk < probability[trajectory].length; chunk++) {
        if (probability[trajectory][chunk] <= 0) continue;
        last = {trajectory, chunk};
        sum += probability[trajectory][chunk];
        if (value < sum) return last;
      }
    }
    return last;
  }

  function representation(angle) {
    const radians = angle * Math.PI / 180;
    return [Math.cos(radians), Math.sin(radians), Math.cos(.7 * radians), Math.sin(.7 * radians)];
  }

  const query = [40,65,100].map(representation);
  const trajectories = [
    [6,20,38,67,101,125,145,165],
    [160,143,119,95,72,49,27,10],
    [12,21,29,45,50,61,76,83],
    [3,39,64,99,130,160,175,185]
  ].map(row => row.map(representation));
  const priorities = [
    [1,1,1,1,1,1,1,1],
    [.5,.9,.6,1.1,1.2,.3,.7,.8],
    [.8,.7,1.1,1.2,.8,.6,.5,.8],
    [.4,1.1,1.3,.9,1.2,1.4,.7,.9]
  ];

  return {align, updatePriorities, probabilities, sample, query, trajectories, priorities};
});
