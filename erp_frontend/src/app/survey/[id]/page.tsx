'use client';

import { useParams } from 'next/navigation';
import SurveyDetailView from '@/components/survey/SurveyDetailView';

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyName = decodeURIComponent((params?.id as string) || '');

  return (
    <SurveyDetailView
      surveyName={surveyName}
      backHref="/survey"
      backLabel="Back to Surveys"
    />
  );
}
