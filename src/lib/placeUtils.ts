/* eslint-disable @typescript-eslint/no-explicit-any */
export function aggregatePlaceVotes(places: any[], userId: number | null) {
  return places.map((p) => {
    const totalUps = p.votes.reduce((s: number, v: any) => s + v.ups, 0);
    const totalDowns = p.votes.reduce((s: number, v: any) => s + v.downs, 0);
    const myVote = userId ? p.votes.find((v: any) => v.userId === userId) : null;
    const { votes: _, ...rest } = p;
    return { ...rest, totalUps, totalDowns, myUps: myVote?.ups ?? 0, myDowns: myVote?.downs ?? 0 };
  });
}
