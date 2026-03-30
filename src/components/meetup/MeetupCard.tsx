"use client";

import { MEMBERS, MEMBER_EMOJIS } from "@/lib/constants";

interface Vote {
  id: number;
  date: string;
  user: { name: string };
}

interface Meetup {
  id: number;
  title: string;
  description: string | null;
  proposedDates: string;
  votes: Vote[];
  status: string;
  confirmedDate: string | null;
  createdAt: string;
}

interface MeetupCardProps {
  meetup: Meetup;
  currentUser: string;
  onVote: (meetupId: number, date: string) => void;
  lastSeen: string | null;
}

const isNew = (createdAt: string, lastSeen: string | null) =>
  lastSeen ? new Date(createdAt) > new Date(lastSeen) : false;

export default function MeetupCard({ meetup, currentUser, onVote, lastSeen }: MeetupCardProps) {
  const dates: string[] = JSON.parse(meetup.proposedDates);

  const votesForDate = (date: string) =>
    meetup.votes.filter((v) => v.date === date);

  const userVotedDate = (date: string) =>
    meetup.votes.some((v) => v.date === date && v.user.name === currentUser);

  const maxVotes = Math.max(...dates.map((d) => votesForDate(d).length), 0);

  return (
    <div className={`bg-gray-800 rounded-2xl p-4 border ${meetup.status === "confirmed" ? "border-green-500/50" : "border-gray-700"}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-semibold flex items-center">
            {meetup.title}
            {isNew(meetup.createdAt, lastSeen) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 flex-shrink-0" />}
          </h3>
          {meetup.description && (
            <p className="text-gray-400 text-sm mt-0.5">{meetup.description}</p>
          )}
        </div>
        {meetup.status === "confirmed" && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-lg">확정</span>
        )}
      </div>

      {meetup.confirmedDate && (
        <div className="mb-3 p-2 rounded-xl bg-green-500/10 text-green-400 text-sm text-center">
          ✅ {meetup.confirmedDate} 확정!
        </div>
      )}

      <div className="space-y-3 mt-3">
        {dates.map((date) => {
          const dateVotes = votesForDate(date);
          const isVoted = userVotedDate(date);
          const isBest = dateVotes.length === maxVotes && maxVotes > 0;

          return (
            <div key={date}>
              {/* 날짜 버튼 */}
              <button
                onClick={() => onVote(meetup.id, date)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  isVoted
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isVoted ? "text-purple-300" : "text-gray-300"}`}>
                    {date}
                  </span>
                  {isBest && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                      베스트
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-xs font-medium">
                  {isVoted ? "✓ " : ""}{dateVotes.length}/4
                </span>
              </button>

              {/* 투표 현황 배지 */}
              <div className="flex gap-1.5 mt-1.5 ml-1">
                {MEMBERS.map((member) => {
                  const voted = dateVotes.some((v) => v.user.name === member);
                  return (
                    <span
                      key={member}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                        voted
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-gray-700/50 text-gray-600 border border-gray-700"
                      }`}
                    >
                      <span>{MEMBER_EMOJIS[member]}</span>
                      <span>{member.slice(0, 1)}{member.slice(1)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
