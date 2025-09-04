import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadSuperintendents,
  loadIndebted,
  loadPerformance,
  ENROLL_BUCKETS,
  usd0,
  int0
} from "../../lib/homeData";

// Minimal horizontal bar using Tailwind only
function HBar({ value, max, title }) {
  const pct = max > 0 ? Math.max(0, (value / max) * 100) : 0;
  return (
    <div className="h-3 w-full bg-gray-200 rounded" title={title}>
      <div className="h-3 bg-indigo-600 rounded" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      className="border rounded px-2 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

/* 1) Highest-Paid Superintendents (table, top 15 by FTE salary) */
export function HighestPaidSuperintendents() {
  const [data, setData] = useState({ tried: [], okPath: null, rows: [] });
  useEffect(function() {
    loadSuperintendents().then(setData).catch(function() {
      setData({ tried: [], okPath: null, rows: [] });
    });
  }, []);

  const top = useMemo(function() {
    return [].concat(data.rows).sort(function(a,b){ return b.fteSalary - a.fteSalary; }).slice(0,15);
  }, [data]);

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">Highest-Paid Superintendents</h3>
      </div>

      {top.length === 0 ? (
        <div className="text-sm text-gray-600 space-y-2">
          <div><strong>File not found.</strong> Please upload one of the following to <code>public/data/home/</code>:</div>
          <ul className="list-disc ml-5">
            <li><code>superintendents.csv</code> (preferred)</li>
            <li><code>superintendent.csv</code></li>
          </ul>
          <div className="text-gray-500">Tried paths: {data.tried.map(function(p,i){ return <code key={i} className="mr-1">{p}</code>; })}</div>
          <div className="text-gray-500">Required columns: <code>DISTRICT_N</code>, <code>DISTRICT_NAME</code>, <code>SUPERINTENDENT_NAME</code>, <code>FTE_SALARY</code>, <code>ENROLLMENT</code></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">District</th>
                <th className="py-2 pr-4">Superintendent</th>
                <th className="py-2 pr-4 text-right">FTE Salary</th>
                <th className="py-2 pr-0 text-right">Enrollment</th>
              </tr>
            </thead>
            <tbody>
              {top.map(function(r) {
                return (
                  <tr key={r.id} className="border-t last:border-b-0">
                    <td className="py-2 pr-4">
                      <Link className="text-indigo-700 hover:underline" to={`/district/${encodeURIComponent(r.id)}`}>
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{r.supName || "—"}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{usd0(r.fteSalary)}</td>
                    <td className="py-2 pr-0 text-right tabular-nums">{int0(r.enroll)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Shared enrollment filter */
function EnrollmentFilter({ value, onChange }) {
  return <Select value={value} onChange={onChange} options={ENROLL_BUCKETS} />;
}

/* 2) Most Indebted Districts (top 15 by debt; filter by enrollment) */
export function MostIndebtedDistricts() {
  const [data, setData] = useState({ tried: [], okPath: null, rows: [] });
  const [bucket, setBucket] = useState("all");
  useEffect(function() {
    loadIndebted().then(setData).catch(function() {
      setData({ tried: [], okPath: null, rows: [] });
    });
  }, []);

  const filtered = useMemo(function() {
    const bucketObj = ENROLL_BUCKETS.find(function(b){ return b.key === bucket; });
    const test = bucketObj && bucketObj.test ? bucketObj.test : function(){ return true; };
    return data.rows.filter(function(r){ return test(Number(r.enroll) || 0); });
  }, [data, bucket]);

  const withMetric = useMemo(function(){
    return filtered.map(function(r){ return Object.assign({}, r, { metric: Number(r.debt) }); })
      .filter(function(r){ return Number.isFinite(r.metric); });
  }, [filtered]);

  const top = useMemo(function(){ return [].concat(withMetric).sort(function(a,b){ return b.metric - a.metric; }).slice(0,15); }, [withMetric]);
  const max = useMemo(function(){ return top.reduce(function(m,r){ return Math.max(m,r.metric); }, 0); }, [top]);

  return (
    <Card title="Most Indebted Districts" action={<EnrollmentFilter value={bucket} onChange={setBucket} />}>
      <div className="flex flex-col gap-2">
        {top.length === 0 && (
          <div className="text-sm text-gray-600 space-y-2">
            <div><strong>File not found.</strong> Please upload <code>indebted.csv</code> to <code>public/data/home/</code>.</div>
            <div className="text-gray-500">Tried paths: {data.tried.map(function(p,i){ return <code key={i} className="mr-1">{p}</code>; })}</div>
          </div>
        )}
        {top.map(function(r){
          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-56 shrink-0">
                <Link className="text-indigo-700 hover:underline" to={`/district/${encodeURIComponent(r.id)}`}>{r.name}</Link>
              </div>
              <div className="grow"><HBar value={r.metric} max={max} title={usd0(r.metric)} /></div>
              <div className="w-28 text-right text-sm tabular-nums">{usd0(r.metric)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* 3) Worst Performing Districts (bottom 15 by score; filter by enrollment) */
export function WorstPerformingDistricts() {
  const [data, setData] = useState({ tried: [], okPath: null, rows: [] });
  const [bucket, setBucket] = useState("all");
  useEffect(function(){
    loadPerformance().then(setData).catch(function(){
      setData({ tried: [], okPath: null, rows: [] });
    });
  }, []);

  const filtered = useMemo(function(){
    const bucketObj = ENROLL_BUCKETS.find(function(b){ return b.key === bucket; });
    const test = bucketObj && bucketObj.test ? bucketObj.test : function(){ return true; };
    return data.rows.filter(function(r){ return test(Number(r.enroll) || 0); });
  }, [data, bucket]);

  const bottom = useMemo(function(){ return [].concat(filtered).sort(function(a,b){ return a.score - b.score; }).slice(0,15); }, [filtered]);
  const max = useMemo(function(){ return bottom.reduce(function(m,r){ return Math.max(m,r.score); }, 0); }, [bottom]);

  return (
    <Card title="Worst Performing Districts" action={<EnrollmentFilter value={bucket} onChange={setBucket} />}>
      <div className="flex flex-col gap-2">
        {bottom.length === 0 && (
          <div className="text-sm text-gray-600 space-y-2">
            <div><strong>File not found.</strong> Please upload <code>performance.csv</code> to <code>public/data/home/</code>.</div>
            <div className="text-gray-500">Tried paths: {data.tried.map(function(p,i){ return <code key={i} className="mr-1">{p}</code>; })}</div>
          </div>
        )}
        {bottom.map(function(r){
          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-56 shrink-0">
                <Link className="text-indigo-700 hover:underline" to={`/district/${encodeURIComponent(r.id)}`}>{r.name}</Link>
              </div>
              <div className="grow"><HBar value={r.score} max={max || 100} title={String(Math.round(r.score))} /></div>
              <div className="w-16 text-right text-sm tabular-nums">{Math.round(r.score)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

