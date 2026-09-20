import { useEffect, useState } from 'react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import JobList from '../../components/JobList';

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [contractType, setContractType] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [provider, setProvider] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('q') || '');
    setLocation(params.get('location') || '');
    setPage(Number(params.get('page') || '1') || 1);
    setContractType(params.get('contract_type') || '');
    setWorkHours(params.get('work_hours') || '');
    setProvider(params.get('provider') || 'all');
  }, []);

  return (
    <SeekerLayout currentPath="/seeker/browse">
      <div className="relative mb-6 overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400 opacity-10 blur-3xl" />
        <h1 className="mb-1 text-2xl font-black text-white">Cari Lowongan Indonesia & Global</h1>
        <p className="text-sm text-slate-300">
          Jelajahi lowongan kerja terpercaya dari Jooble Indonesia, mitra resmi LOXER, Careerjet, dan feed Arbeitnow dalam satu pencarian.
        </p>
      </div>

      <JobList
        initialKeywords={searchQuery}
        initialLocation={location}
        initialPage={page}
        initialContractType={contractType}
        initialWorkHours={workHours}
        initialProvider={provider}
      />
    </SeekerLayout>
  );
}
