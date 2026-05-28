import { useState } from 'react';
import { CheckCircle, XCircle, FileText, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CoverLetter, ResumeDraft } from '@/types';

interface Props {
  coverLetter: CoverLetter | null;
  resumeDraft: ResumeDraft | null;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  loading?: boolean;
}

export default function DraftReviewCard({ coverLetter, resumeDraft, onApprove, onReject, loading }: Props) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const handleReject = () => {
    if (!feedback.trim()) return;
    onReject(feedback.trim());
  };

  return(
    <div className="space-y-4">
      <Tabs defaultValue="cover-letter">
        <TabsList>
          <TabsTrigger value="cover-letter" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />Cover Letter
          </TabsTrigger>
          <TabsTrigger value="resume" className="gap-1.5">
            <FileCode className="h-3.5 w-3.5" />Resume
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cover-letter">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Iteration #{coverLetter?.iteration ?? '—'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coverLetter ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {coverLetter.content}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No cover letter available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resume">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                LaTeX Source — Iteration #{resumeDraft?.iteration ?? '—'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resumeDraft ? (
                <pre className="max-h-96 overflow-y-auto rounded bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {resumeDraft.latex_source}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No resume draft available</p>
              )}
              {resumeDraft?.compiled_pdf_s3_key && (
                <p className="mt-2 text-xs text-muted-foreground">
                  PDF compiled ✓
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!showFeedback ? (
        <div className="flex gap-2">
          <Button onClick={onApprove} disabled={loading} className="gap-1.5">
            <CheckCircle className="h-4 w-4" />Approve &amp; Submit
          </Button>
          <Button variant="outline" onClick={() => setShowFeedback(true)} className="gap-1.5">
            <XCircle className="h-4 w-4" />Request Changes
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Describe what you'd like changed…"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!feedback.trim() || loading}
            >
              Send Feedback
            </Button>
            <Button variant="ghost" onClick={() => setShowFeedback(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
