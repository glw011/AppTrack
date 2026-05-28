import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download, Star } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { resumesApi } from '@/api/resumes';
import { formatDate } from '@/lib/utils';

export default function Resumes() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: resumesApi.list,
  });

  const uploadMutation = useMutation({
    mutationFn: resumesApi.upload,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume uploaded');
    },
    onError: () => toast.error('Upload failed — ensure file is a PDF under 10 MB'),
  });

  const deleteMutation = useMutation({
    mutationFn: resumesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) uploadMutation.mutate(file);
    if(inputRef.current) inputRef.current.value = '';
  };

  return(
    <div>
      <Header
        title="Resumes"
        action={
          <>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
              <Upload className="mr-1.5 h-4 w-4" />
              {uploadMutation.isPending ? 'Uploading…' : 'Upload PDF'}
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload your resume PDFs. Mark one as the base template for the Draft Agent to tailor from.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : !resumes?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">No resumes yet. Upload a PDF to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resumes.map(resume => (
              <Card key={resume.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {resume.filename}
                        {resume.is_base_template && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                            <Star className="h-2.5 w-2.5" />Base Template
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(resume.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {resume.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={resume.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(resume.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
