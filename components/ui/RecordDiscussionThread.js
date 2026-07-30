'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from './core';
import { MessageSquare, Send, AtSign, User, Loader2 } from 'lucide-react';
import { toast } from './Toast';

export default function RecordDiscussionThread({ recordType, recordId, className = '' }) {
  const { call, user } = useAppState();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);

  const teamRoles = ['director', 'finance', 'procurement', 'admin'];

  useEffect(() => {
    if (recordType && recordId) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordType, recordId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await call('getComments', recordType, recordId);
      setComments(res || []);
    } catch (e) {
      console.error('Failed to load discussion comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewComment(val);

    const lastChar = val.slice(-1);
    if (lastChar === '@') {
      setShowMentions(true);
      setMentionSuggestions(teamRoles);
    } else if (val.includes('@')) {
      const parts = val.split('@');
      const query = parts[parts.length - 1].toLowerCase();
      setMentionSuggestions(teamRoles.filter(r => r.includes(query)));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (role) => {
    const parts = newComment.split('@');
    parts.pop();
    setNewComment(parts.join('@') + `@${role} `);
    setShowMentions(false);
  };

  const handleSend = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!newComment.trim()) return;

    // Detect mentioned roles
    const mentions = teamRoles.filter(role => newComment.toLowerCase().includes(`@${role}`));

    setSubmitting(true);
    try {
      const res = await call('addComment', user, recordType, recordId, newComment.trim(), mentions);
      if (res && res.ok) {
        setNewComment('');
        loadComments();
        toast.success('Comment added to thread');
      } else {
        toast.error('Failed to post comment');
      }
    } catch (err) {
      toast.error('Error posting comment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={`border-border bg-card shadow-xs ${className}`}>
      <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600 dark:text-gold" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Discussion & Team Activity ({comments.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Comments History */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-gold" />
              <span>Loading discussion thread...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground font-medium">
              No comments yet. Start the discussion below or tag `@director` / `@finance`.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <User className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
                    <span>{c.author_name}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({c.author_email})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                <p className="text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed">
                  {c.content}
                </p>

                {c.mentions && c.mentions.length > 0 && (
                  <div className="flex items-center gap-1 pt-1">
                    {c.mentions.map((m, idx) => (
                      <span key={idx} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-gold border border-amber-500/20">
                        @{m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input & Mention Autocomplete */}
        <div className="relative space-y-2 pt-2 border-t border-border/60">
          {showMentions && (
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 p-1 space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1">
                <AtSign className="w-3 h-3 text-amber-600 dark:text-gold" /> Mention Role
              </div>
              {mentionSuggestions.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => insertMention(role)}
                  className="w-full text-left px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted rounded transition-colors uppercase"
                >
                  @{role}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Add a comment... (Type '@' to tag Director, Finance, Procurement)"
              className="text-xs bg-muted/20 border-border flex-1"
            />
            <Button
              type="button"
              onClick={handleSend}
              size="sm"
              variant="primary"
              disabled={submitting || !newComment.trim()}
              className="shrink-0"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />} Post
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
