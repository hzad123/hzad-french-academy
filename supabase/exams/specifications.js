// Server-only source record. The owner supplied the provider page text on
// 2026-11-05 because this environment cannot fetch the provider sites.
const evidence = {
 tef: {url:'https://www.lefrancaisdesaffaires.fr/tests-diplomes/test-evaluation-francais-tef/tef-canada/',method:'owner-supplied provider-page text',receivedAt:'2026-11-05',scope:'section counts, durations, task purposes and TEF writing minimums'},
 tcf: {url:'https://www.france-education-international.fr/test/tcf-canada',method:'owner-supplied provider-page text',receivedAt:'2026-11-05',scope:'section counts, durations, task purposes, writing ranges, one listening playback and public assessment capabilities'}
};
export const SPECIFICATIONS = {
 'tef-canada':{verified:true,verifiedAt:'2026-11-05',sources:[evidence.tef],assessment:'HZad analytic criteria aligned with the task purposes; no proprietary official weights or scaled-score conversion',sections:{reading:{items:40,seconds:3600},listening:{items:40,seconds:2400},writing:{items:2,seconds:3600},speaking:{items:2,seconds:900}}},
 'tcf-canada':{verified:true,verifiedAt:'2026-11-05',sources:[evidence.tcf],assessment:'HZad analytic criteria aligned with the supplied public capabilities; no proprietary official weights or scaled-score conversion',sections:{reading:{items:39,seconds:3600},listening:{items:39,seconds:2100},writing:{items:3,seconds:3600},speaking:{items:3,seconds:720}}}
};
