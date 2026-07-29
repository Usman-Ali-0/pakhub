'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Pin, CheckCircle2, Lock, Reply, MoreHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import toast from 'react-hot-toast';

export default function DiscussionDetailPage({
  params,
}: {
  params: React.Usable<{ owner: string; repo: string; number: string }>;
}) {
  const resolvedParams = React.use(params);
  const { owner, repo, number } = resolvedParams;
  const discussionNumber = parseInt(number, 10);
  const queryClient = useQueryClient();

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: discussion, isLoading: isDiscussionLoading } = useQuery({
    queryKey: ['discussion', owner, repo, discussionNumber],
    queryFn: () => discussionsApi.get(owner, repo, discussionNumber),
  });

  const { data: comments, isLoading: isCommentsLoading } = useQuery({
    queryKey: ['discussion_comments', owner, repo, discussionNumber],
    queryFn: () => discussionsApi.getComments(owner, repo, discussionNumber),
  });

  const commentMutation = useMutation({
    mutationFn: (data: { body: string; parentId?: string }) =>
      discussionsApi.addComment(owner, repo, discussionNumber, data),
    onSuccess: () => {
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
      toast.success('Comment added');
      queryClient.invalidateQueries({ queryKey: ['discussion_comments', owner, repo, discussionNumber] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    },
  });

  const markAnswerMutation = useMutation({
    mutationFn: (commentId: string) => discussionsApi.markAnswer(owner, repo, discussionNumber, commentId),
    onSuccess: () => {
      toast.success('Marked as answer');
      queryClient.invalidateQueries({ queryKey: ['discussion', owner, repo, discussionNumber] });
      queryClient.invalidateQueries({ queryKey: ['discussion_comments', owner, repo, discussionNumber] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to mark answer');
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: () => discussionsApi.update(owner, repo, discussionNumber, { pinned: !discussion?.pinned }),
    onSuccess: () => {
      toast.success(discussion?.pinned ? 'Unpinned discussion' : 'Pinned discussion');
      queryClient.invalidateQueries({ queryKey: ['discussion', owner, repo, discussionNumber] });
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: () => discussionsApi.update(owner, repo, discussionNumber, { locked: !discussion?.locked }),
    onSuccess: () => {
      toast.success(discussion?.locked ? 'Unlocked discussion' : 'Locked discussion');
      queryClient.invalidateQueries({ queryKey: ['discussion', owner, repo, discussionNumber] });
    },
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    commentMutation.mutate({ body: newComment });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    commentMutation.mutate({ body: replyContent, parentId });
  };

  if (isDiscussionLoading) {
    return <div className="p-8 text-center text-slate-500">Loading discussion...</div>;
  }

  if (!discussion) {
    return <div className="p-8 text-center text-red-500">Discussion not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-sm font-medium">
            <span>{discussion.category?.emoji}</span> {discussion.category?.name}
          </span>
        </div>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <h1 className="text-3xl font-bold break-words">
            {discussion.title} <span className="text-slate-400 font-normal">#{discussion.number}</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              id="pin-btn"
              onClick={() => togglePinMutation.mutate()}
              className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <Pin size={16} className={discussion.pinned ? 'text-blue-500' : ''} /> {discussion.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              id="lock-btn"
              onClick={() => toggleLockMutation.mutate()}
              className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <Lock size={16} className={discussion.locked ? 'text-red-500' : ''} /> {discussion.locked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 pb-6 border-b border-slate-200 dark:border-slate-800">
          <Link href={`/${discussion.author.username}`} className="font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-500">
            {discussion.author.username}
          </Link>
          <span>started this discussion {formatDistanceToNow(new Date(discussion.createdAt))} ago</span>
        </div>
      </div>

      {/* Main Content & Comments */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {/* Discussion Body */}
          <div className="flex gap-4 mb-8">
            <div className="flex-shrink-0">
              <img src={discussion.author.avatarUrl || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full" />
            </div>
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500 flex justify-between items-center">
                <span>
                  <Link href={`/${discussion.author.username}`} className="font-semibold text-slate-700 dark:text-slate-300">
                    {discussion.author.username}
                  </Link>{' '}
                  commented {formatDistanceToNow(new Date(discussion.createdAt))} ago
                </span>
                <span className="flex items-center gap-2">
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-semibold">Author</span>
                </span>
              </div>
              <div className="p-4 prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {discussion.body}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 my-6"></div>

          {/* Comments List */}
          <div className="space-y-6 mb-8">
            {isCommentsLoading ? (
              <div className="text-sm text-slate-500">Loading comments...</div>
            ) : (
              (comments || []).map((comment: any) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <img src={comment.author.avatarUrl || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <div className={`bg-white dark:bg-slate-900 border rounded-lg overflow-hidden ${comment.isAnswer ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className={`px-4 py-2 border-b text-sm text-slate-500 flex justify-between items-center ${comment.isAnswer ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <Link href={`/${comment.author.username}`} className="font-semibold text-slate-700 dark:text-slate-300">
                            {comment.author.username}
                          </Link>
                          <span>commented {formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                          {comment.isAnswer && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/50">
                              <CheckCircle2 size={12} /> Answer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {discussion.category?.isAnswerable && !comment.isAnswer && (
                            <button
                              id={`mark-answer-${comment.id}`}
                              onClick={() => markAnswerMutation.mutate(comment.id)}
                              className="text-xs hover:text-emerald-500 flex items-center gap-1 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                              title="Mark as answer"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            id={`reply-btn-${comment.id}`}
                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            className="text-xs hover:text-emerald-500 flex items-center gap-1 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            <Reply size={14} /> Reply
                          </button>
                        </div>
                      </div>
                      <div className="p-4 prose dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {comment.body}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="flex gap-3">
                            <div className="flex-shrink-0">
                              <img src={reply.author.avatarUrl || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full" />
                            </div>
                            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 flex justify-between items-center">
                                <span>
                                  <Link href={`/${reply.author.username}`} className="font-semibold text-slate-700 dark:text-slate-300">
                                    {reply.author.username}
                                  </Link>{' '}
                                  replied {formatDistanceToNow(new Date(reply.createdAt))} ago
                                </span>
                              </div>
                              <div className="p-3 prose dark:prose-invert max-w-none text-sm">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                  {reply.body}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col">
                          <MarkdownEditor
                            value={replyContent}
                            onChange={setReplyContent}
                            minHeight="100px"
                          />
                          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button
                              id={`cancel-reply-${comment.id}`}
                              onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                              className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              id={`submit-reply-${comment.id}`}
                              onClick={() => handleReply(comment.id)}
                              disabled={commentMutation.isPending || !replyContent.trim()}
                              className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 my-6"></div>

          {/* Add Comment */}
          {discussion.locked ? (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md">
              <Lock size={18} />
              <span>This discussion has been locked and is limited to collaborators.</span>
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="flex gap-4">
              <div className="flex-shrink-0 hidden md:block">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <MessageSquare size={18} className="text-slate-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-sm">
                    Write a comment
                  </div>
                  <MarkdownEditor
                    value={newComment}
                    onChange={setNewComment}
                    minHeight="150px"
                  />
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                      id="submit-comment-btn"
                      type="submit"
                      disabled={commentMutation.isPending || !newComment.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                    >
                      {commentMutation.isPending ? 'Commenting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1">Category</h3>
            <span className="flex items-center gap-2 text-sm font-medium">
              <span>{discussion.category?.emoji}</span> {discussion.category?.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
