/** District close-up stages: each wide authored view (`SHOTS` in headlineCamera.ts) and the district slots it frames.
 * Districts also read this table so the slots of one stage switch at the same ladder rung (`stageRanks` in districtMeters.ts).
 * Slots outside every stage (nw:bay3, nw:bay5, nw:street, four courts, three pods) still change, but never lead a close-up. */
export const STAGE_SLOTS: Readonly<Record<string, readonly string[]>> = {
  'nw:stage-west': ['nw:bay1', 'nw:bay2', 'nw:bay6'],
  'nw:stage-mid': ['nw:bay4'],
  'sw:stage-rooms-east': ['sw:room1', 'sw:room2', 'sw:room3'],
  'sw:stage-rooms-west': ['sw:room4', 'sw:room5', 'sw:room6'],
  'sw:stage-courts-south': ['sw:court3', 'sw:court6', 'sw:court10'],
  'sw:stage-courts-west': ['sw:court2', 'sw:court7', 'sw:court8'],
  'se:stage-east': ['se:tower1', 'se:tower2', 'se:pod4', 'se:pod5', 'se:pod6', 'se:pod7', 'se:pod8', 'se:pod9', 'se:pod10'],
  'se:stage-south': ['se:tower3', 'se:tower4'],
};
