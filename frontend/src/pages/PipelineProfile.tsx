import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import TagInput from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { pipelineApi } from '@/api/pipeline';

const profileSchema = z.object({
  headline: z.string().max(500).optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  yearsExperience: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
});

const configSchema = z.object({
  targetTitles: z.array(z.string()).default([]),
  requiredKeywords: z.array(z.string()).default([]),
  excludedCompanies: z.array(z.string()).default([]),
  preferredIndustries: z.array(z.string()).default([]),
  minSalary: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']).default('any'),
  location: z.string().optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior']).default('entry'),
});

type ProfileValues = z.infer<typeof profileSchema>;
type ConfigValues = z.infer<typeof configSchema>;

export default function PipelineProfile() {
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: pipelineApi.getProfile,
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['search-config'],
    queryFn: pipelineApi.getSearchConfig,
  });

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const configForm = useForm<ConfigValues>({ resolver: zodResolver(configSchema) });

  useEffect(() => {
    if(profile){
      profileForm.reset({
        headline: profile.headline ?? '',
        summary: profile.summary ?? '',
        skills: profile.skills,
        technologies: profile.technologies,
        certifications: profile.certifications,
        yearsExperience: profile.years_experience ?? '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if(config){
      configForm.reset({
        targetTitles: config.target_titles,
        requiredKeywords: config.required_keywords,
        excludedCompanies: config.excluded_companies,
        preferredIndustries: config.preferred_industries,
        minSalary: config.min_salary ?? '',
        remotePreference: config.remote_preference,
        location: config.location ?? '',
        experienceLevel: config.experience_level,
      });
    }
  }, [config]);

  const saveProfileMutation = useMutation({
    mutationFn: (data: ProfileValues) => pipelineApi.updateProfile({
      ...data,
      yearsExperience: data.yearsExperience ? Number(data.yearsExperience) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile saved');
    },
    onError: () => toast.error('Failed to save profile'),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (data: ConfigValues) => pipelineApi.updateSearchConfig({
      ...data,
      minSalary: data.minSalary ? Number(data.minSalary) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['search-config'] });
      toast.success('Search config saved');
    },
    onError: () => toast.error('Failed to save config'),
  });

  if(profileLoading || configLoading){
    return(
      <div>
        <Header title="My Pipeline Profile" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return(
    <div>
      <Header title="My Pipeline Profile" />
      <div className="p-6 space-y-8 max-w-3xl">
        {/* User Profile */}
        <form onSubmit={profileForm.handleSubmit(d => saveProfileMutation.mutate(d))} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Professional Profile</CardTitle>
              <CardDescription>Used by the Draft Agent to tailor cover letters and resumes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Headline</Label>
                <Input placeholder="Full-Stack Developer | React · Node.js · PostgreSQL" {...profileForm.register('headline')} />
              </div>
              <div className="space-y-1.5">
                <Label>Summary</Label>
                <Textarea rows={4} placeholder="Brief professional summary for cover letter introductions…" {...profileForm.register('summary')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Years of Experience</Label>
                  <Input type="number" min={0} placeholder="2" {...profileForm.register('yearsExperience')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Skills</Label>
                <Controller
                  name="skills"
                  control={profileForm.control}
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="Add skill (Enter)…" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Technologies</Label>
                <Controller
                  name="technologies"
                  control={profileForm.control}
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="Add technology (Enter)…" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Certifications</Label>
                <Controller
                  name="certifications"
                  control={profileForm.control}
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="Add certification (Enter)…" />
                  )}
                />
              </div>
              <Button type="submit" disabled={saveProfileMutation.isPending}>
                {saveProfileMutation.isPending ? 'Saving…' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Search Config */}
        <form onSubmit={configForm.handleSubmit(d => saveConfigMutation.mutate(d))} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Job Search Configuration</CardTitle>
              <CardDescription>Used by the Search Agent to find relevant job postings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Target Job Titles</Label>
                <Controller
                  name="targetTitles"
                  control={configForm.control}
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="Software Engineer, Full Stack Developer…" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Required Keywords</Label>
                <Controller
                  name="requiredKeywords"
                  control={configForm.control}
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="React, TypeScript…" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Excluded Companies</Label>
                <Controller
                  name="excludedCompanies"
                  control={configForm.control}
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="Companies to skip…" />
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Remote Preference</Label>
                  <Controller
                    name="remotePreference"
                    control={configForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="remote">Remote Only</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Experience Level</Label>
                  <Controller
                    name="experienceLevel"
                    control={configForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry</SelectItem>
                          <SelectItem value="mid">Mid</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input placeholder="New York, NY" {...configForm.register('location')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Salary ($)</Label>
                  <Input type="number" placeholder="70000" {...configForm.register('minSalary')} />
                </div>
              </div>
              <Button type="submit" disabled={saveConfigMutation.isPending}>
                {saveConfigMutation.isPending ? 'Saving…' : 'Save Search Config'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
