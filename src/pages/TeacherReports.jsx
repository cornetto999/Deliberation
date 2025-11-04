import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { Loader2, BarChart3, Upload, Filter, Search, TrendingUp, Users, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const TeacherReports = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("P1");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // New state for summary
  const [programs, setPrograms] = useState([]);
  const [filters, setFilters] = useState({
    program: "",
    schoolYear: "2025-2026",
    semester: "1st",
    period: "All",
  });
  const [summary, setSummary] = useState([]);
  const [consistentCounts, setConsistentCounts] = useState({ green: 0, yellow: 0, red: 0 });
  const [deptChart, setDeptChart] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Zone modal state
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneModalZone, setZoneModalZone] = useState(null);

  // Compute teachers for selected zone and period - matches backend logic exactly
  const zoneTeachers = useMemo(() => {
    if (!zoneModalZone) return [];
    const targetZone = zoneModalZone;

    // Helper: zone from percentage using 10/40 thresholds (matches backend)
    const zoneFromPercent = (pct) => {
      if (!isFinite(pct)) return null;
      if (pct <= 0) return 'green';
      if (pct <= 10) return 'green';
      if (pct <= 40) return 'yellow';
      return 'red';
    };

    // Helper: zone from category label (matches backend)
    const zoneFromCategoryLabel = (cat) => {
      const u = String(cat || "").toUpperCase().trim();
      if (u === '') return null;
      if (u.startsWith('RED')) return 'red';
      if (u.startsWith('YELLOW')) return 'yellow';
      if (u.startsWith('GREEN')) return 'green';
      return null;
    };

    // Helper: determine zone for a teacher in a given period (matches backend zoneForTeacherPeriod)
    const zoneForTeacherPeriod = (t, pk) => {
      const percentKey = `${pk}_percent`;
      const failedKey = `${pk}_failed`;
      const categoryKey = `${pk}_category`;
      
      const dbPercentRaw = t[percentKey];
      const failedRaw = t[failedKey];
      const enrolledRaw = t.enrolled_students;

      const dbPercent = (typeof dbPercentRaw === 'number' || (typeof dbPercentRaw === 'string' && dbPercentRaw !== '')) 
        ? Number(dbPercentRaw) : null;
      const failed = (typeof failedRaw === 'number' || (typeof failedRaw === 'string' && failedRaw !== '')) 
        ? Number(failedRaw) : null;
      const enrolled = (typeof enrolledRaw === 'number' || (typeof enrolledRaw === 'string' && enrolledRaw !== '')) 
        ? Number(enrolledRaw) : null;

      // First try: calculate from failed/enrolled
      if (failed !== null && isFinite(failed) && enrolled !== null && isFinite(enrolled) && enrolled > 0) {
        const pct = (failed / enrolled) * 100.0;
        return zoneFromPercent(pct);
      }
      
      // Second try: use dbPercent
      if (dbPercent !== null && isFinite(dbPercent)) {
        return zoneFromPercent(dbPercent);
      }
      
      // Third try: use category label
      const cat = t[categoryKey] || '';
      return zoneFromCategoryLabel(cat);
    };

    return (teachers || []).filter((t) => {
      if (filters.period === "All") {
        // For "All" period: check all periods and find worst-case (matches backend consistent zone logic)
        const zones = [];
        ['p1', 'p2', 'p3'].forEach((pk) => {
          const z = zoneForTeacherPeriod(t, pk);
          if (z) zones.push(z);
        });
        
        // Worst-case zone: red > yellow > green (exactly matches backend line 147-149)
        const worstZone = zones.includes('red') ? 'red' 
          : zones.includes('yellow') ? 'yellow' 
          : zones.includes('green') ? 'green' 
          : null;
        
        return worstZone === targetZone;
      } else {
        // For specific period: use that period's zone directly
        const pk = filters.period.toLowerCase();
        const z = zoneForTeacherPeriod(t, pk);
        return z === targetZone;
      }
    });
  }, [teachers, filters.period, zoneModalZone]);

  // Top 10 failure percent based on selected period
  const top10Data = useMemo(() => {
    const toNum = (x) => {
      if (typeof x === 'number') return x;
      const n = parseFloat(x || '0');
      return isNaN(n) ? 0 : n;
    };
    const rows = (teachers || []).map(t => {
      const p1 = toNum(t.p1_percent);
      const p2 = toNum(t.p2_percent);
      const p3 = toNum(t.p3_percent);
      let percent = 0;
      if (filters.period === 'P1') percent = p1;
      else if (filters.period === 'P2') percent = p2;
      else if (filters.period === 'P3') percent = p3;
      else percent = Math.max(p1, p2, p3);
      return { teacher: `${t.first_name} ${t.last_name}`, percent };
    })
    .filter(r => Number.isFinite(r.percent));
    rows.sort((a,b) => b.percent - a.percent);
    return rows.slice(0, 10);
  }, [teachers, filters.period]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch(apiUrl('programs.php'));
        let data = [];
        try {
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const parsed = await res.json();
            data = Array.isArray(parsed) ? parsed : [];
          }
        } catch (_) {
          data = [];
        }
        if (Array.isArray(data)) setPrograms(data);
      } catch (e) {
        console.warn('Failed to load programs:', e);
      }
    };
    fetchPrograms();
  }, []);

  const generateReport = async () => {
    try {
      setLoadingSummary(true);
      setErrorSummary(null);
      const params = new URLSearchParams({
        school_year: filters.schoolYear,
        semester: filters.semester,
        period: filters.period,
      });
      if (filters.program) {
        params.set('program_id', filters.program);
      }
      const res = await fetch(apiUrl(`teacher_summary.php?${params.toString()}`));
      let data = {};
      try {
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          data = await res.json();
        }
      } catch (_) {
        data = {};
      }
      setSummary(Array.isArray(data.summary) ? data.summary : []);
      setConsistentCounts(data.consistent_zone_counts || { green: 0, yellow: 0, red: 0 });
      setDeptChart(Array.isArray(data.department_chart) ? data.department_chart : []);
    } catch (e) {
      console.error('Failed to generate report:', e);
      setErrorSummary('Failed to generate report');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    // Auto-update on filter change to meet dynamic update requirement
    generateReport();
  }, [filters.program, filters.schoolYear, filters.semester, filters.period]);
  // Ensure teachers load via effect; remove stray top-level call
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const tParams = new URLSearchParams({
          recompute: '1',
          school_year: filters.schoolYear,
          semester: filters.semester,
        });
        if (filters.program) {
          tParams.set('program_id', filters.program);
        }
        const response = await fetch(apiUrl(`teachers.php?${tParams.toString()}`));
        let data = [];
        try {
          const ct = response.headers.get('content-type') || '';
          if (response.ok && ct.includes('application/json')) {
            const parsed = await response.json();
            data = Array.isArray(parsed) ? parsed : [];
          }
        } catch (_) {
          data = [];
        }
        setTeachers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching teachers for reports:', err);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [filters.program, filters.schoolYear, filters.semester]);

  const calcPercent = (failed, enrolled) => {
    const f = Number(failed);
    const e = Number(enrolled);
    if (!isFinite(f) || !isFinite(e) || e <= 0) return null;
    return (f / e) * 100;
  };

  const percentFromData = (
    dbPercent,
    failed,
    enrolled
  ) => {
    const direct = Number(dbPercent);
    const calc = calcPercent(failed, enrolled);
    if (calc !== null) return calc;
    if (isFinite(direct)) return direct;
    return null;
  };

  function categoryFromPercentValue(pct) {
    if (!isFinite(pct)) return 'RED (40.01%-100%)';
    if (pct === 0) return 'GREEN (0%)';
    if (pct <= 10) return 'GREEN (0.01%-10%)';
    if (pct <= 40) return 'YELLOW (10.01%-40%)';
    return 'RED (40.01%-100%)';
  };

  // Period-aware keys using filters.period (supports All)
  const totalsData = useMemo(() => {
    const totalEnrolled = (teachers || []).reduce((sum, t) => sum + (Number(t.enrolled_students) || 0), 0);
    const totalFailed = (teachers || []).reduce((sum, t) => {
      if (filters.period === 'All') {
        // Prefer overall failed_students; fallback to max of period fails if missing
        const overallFailedRaw = t.failed_students;
        const overallFailed = Number(overallFailedRaw);
        if (isFinite(overallFailed) && overallFailed > 0) {
          return sum + overallFailed;
        }
        const f1 = Number(t.p1_failed) || 0;
        const f2 = Number(t.p2_failed) || 0;
        const f3 = Number(t.p3_failed) || 0;
        const fallback = Math.max(f1, f2, f3);
        return sum + fallback;
      } else {
        const key = `${filters.period.toLowerCase()}_failed`;
        return sum + (Number(t[key]) || 0);
      }
    }, 0);
    return [{ label: `Totals ${filters.period}`, enrolled: totalEnrolled, failed: totalFailed }];
  }, [teachers, filters.period]);

  const categoryDistribution = useMemo(() => {
    if (filters.period === 'All') {
      const green = Number(consistentCounts.green || 0);
      const yellow = Number(consistentCounts.yellow || 0);
      const red = Number(consistentCounts.red || 0);
      return [
        { name: 'GREEN', value: green },
        { name: 'YELLOW', value: yellow },
        { name: 'RED', value: red },
      ];
    }
    const match = (summary || []).find((row) => row.period === filters.period);
    const green = Number(match?.green_count || 0);
    const yellow = Number(match?.yellow_count || 0);
    const red = Number(match?.red_count || 0);
    return [
      { name: 'GREEN', value: green },
      { name: 'YELLOW', value: yellow },
      { name: 'RED', value: red },
    ];
  }, [summary, filters.period, consistentCounts]);

  const percentChartConfig = {
    percent: { label: "% Failed" },
  };

  const COLOR_GREEN = "#22c55e"; // green-500
  const COLOR_YELLOW = "#facc15"; // yellow-400
  const COLOR_RED = "#ef4444"; // red-500

  const getColorForPercent = (pct) => {
    if (pct === 0) return COLOR_GREEN;
    if (pct <= 10) return COLOR_GREEN;
    if (pct <= 40) return COLOR_YELLOW;
    return COLOR_RED;
  };

  // Compute stacked totals by zone for Enrolled and Failed
  const stackedTotalsChartConfig = {
    enrolled_green: { label: "Enrolled GREEN", color: "#22c55e" }, // green-500
    enrolled_yellow: { label: "Enrolled YELLOW", color: "#facc15" }, // yellow-400
    enrolled_red: { label: "Enrolled RED", color: "#ef4444" }, // red-500
    failed_green: { label: "Failed GREEN", color: "#16a34a" }, // green-600 (distinct)
    failed_yellow: { label: "Failed YELLOW", color: "#ca8a04" }, // yellow-600 (distinct)
    failed_red: { label: "Failed RED", color: "#b91c1c" }, // red-700 (distinct)
  };

  const totalsStackedData = useMemo(() => {
    const buckets = {
      enrolled_green: 0,
      enrolled_yellow: 0,
      enrolled_red: 0,
      failed_green: 0,
      failed_yellow: 0,
      failed_red: 0,
    };

    const getZoneFromValues = (
      percent,
      failed,
      enrolled,
      category
    ) => {
      const p = Number(percent);
      const f = Number(failed);
      const e = Number(enrolled);
      const pct = isFinite(p) ? p : (isFinite(f) && isFinite(e) && e > 0 ? (f / e) * 100 : null);
      if (pct !== null) {
        const label = categoryFromPercentValue(pct);
        if (label.startsWith('GREEN')) return 'green';
        if (label.startsWith('YELLOW')) return 'yellow';
        return 'red';
      }
      const cat = String(category || "").toUpperCase().trim();
      if (!cat) return null;
      if (cat.startsWith("RED")) return "red";
      if (cat.startsWith("YELLOW")) return "yellow";
      if (cat.startsWith("GREEN")) return "green";
      return null;
    };

    const getZoneForTeacher = (t) => {
      if (filters.period === "All") {
        const zones = [];
        (['p1','p2','p3']).forEach((pk) => {
          const z = getZoneFromValues(t[`${pk}_percent`], t[`${pk}_failed`], t.enrolled_students, t[`${pk}_category`]);
          if (z) zones.push(z);
        });
        const worst = zones.includes("red") ? "red" : zones.includes("yellow") ? "yellow" : zones.includes("green") ? "green" : null;
        return worst;
      }
      const pk = filters.period.toLowerCase();
      return getZoneFromValues(t[`${pk}_percent`], t[`${pk}_failed`], t.enrolled_students, t[`${pk}_category`]);
    };

    (teachers || []).forEach((t) => {
      const z = getZoneForTeacher(t);
      if (!z) return;

      const enrolled = Number(t.enrolled_students) || 0;
      buckets[`enrolled_${z}`] += enrolled;

      let failed = 0;
      if (filters.period === "All") {
        const overallFailedRaw = t.failed_students;
        const overallFailed = Number(overallFailedRaw);
        if (isFinite(overallFailed) && overallFailed > 0) {
          failed = overallFailed;
        } else {
          const f1 = Number(t.p1_failed) || 0;
          const f2 = Number(t.p2_failed) || 0;
          const f3 = Number(t.p3_failed) || 0;
          failed = Math.max(f1, f2, f3);
        }
      } else {
        const key = `${filters.period.toLowerCase()}_failed`;
        failed = Number(t[key]) || 0;
      }
      buckets[`failed_${z}`] += failed;
    });

    return [{ label: `Totals ${filters.period}`, ...buckets }];
  }, [teachers, filters.period]);

  // Simple 3-series config for zone totals (one bar per color)
  const zoneTotalsFailedChartConfig = {
    green: { label: "GREEN", color: COLOR_GREEN },
    yellow: { label: "YELLOW", color: COLOR_YELLOW },
    red: { label: "RED", color: COLOR_RED },
  };

  // Compute totals of FAILED by zone (one bar per color)
  const totalsZoneFailedData = useMemo(() => {
    const buckets = { green: 0, yellow: 0, red: 0 };

    const getZoneFromValues = (
      percent,
      failed,
      enrolled,
      category
    ) => {
      const p = Number(percent);
      const f = Number(failed);
      const e = Number(enrolled);
      const pct = isFinite(p) ? p : (isFinite(f) && isFinite(e) && e > 0 ? (f / e) * 100 : null);
      if (pct !== null) {
        const label = categoryFromPercentValue(pct);
        if (label.startsWith('GREEN')) return 'green';
        if (label.startsWith('YELLOW')) return 'yellow';
        return 'red';
      }
      const cat = String(category || "").toUpperCase().trim();
      if (!cat) return null;
      if (cat.startsWith("RED")) return "red";
      if (cat.startsWith("YELLOW")) return "yellow";
      if (cat.startsWith("GREEN")) return "green";
      return null;
    };

    const getZoneForTeacherLocal = (t) => {
      if (filters.period === "All") {
        const zones = [];
        (['p1','p2','p3']).forEach((pk) => {
          const z = getZoneFromValues(t[`${pk}_percent`], t[`${pk}_failed`], t.enrolled_students, t[`${pk}_category`]);
          if (z) zones.push(z);
        });
        return zones.includes("red") ? "red" : zones.includes("yellow") ? "yellow" : zones.includes("green") ? "green" : null;
      }
      const pk = filters.period.toLowerCase();
      return getZoneFromValues(t[`${pk}_percent`], t[`${pk}_failed`], t.enrolled_students, t[`${pk}_category`]);
    };

    (teachers || []).forEach((t) => {
      const z = getZoneForTeacherLocal(t);
      if (!z) return;

      let failed = 0;
      if (filters.period === "All") {
        const overallFailedRaw = t.failed_students;
        const overallFailed = Number(overallFailedRaw);
        if (isFinite(overallFailed) && overallFailed > 0) {
          failed = overallFailed;
        } else {
          const f1 = Number(t.p1_failed) || 0;
          const f2 = Number(t.p2_failed) || 0;
          const f3 = Number(t.p3_failed) || 0;
          failed = Math.max(f1, f2, f3);
        }
      } else {
        const key = `${filters.period.toLowerCase()}_failed`;
        failed = Number(t[key]) || 0;
      }

      buckets[z] += failed;
    });

    return [{ label: `Totals ${filters.period}`, ...buckets }];
  }, [teachers, filters.period]);
  // Compute aggregated failed percent for totals chart
  const totalsPercent = useMemo(() => {
    const row = (totalsData && totalsData[0]) ? totalsData[0] : null;
    if (!row) return null;
    const e = Number(row.enrolled || 0);
    const f = Number(row.failed || 0);
    if (!isFinite(e) || e <= 0 || !isFinite(f)) return null;
    return (f / e) * 100;
  }, [totalsData]);

  // Dynamic colors: failed bar reflects zone thresholds (green/yellow/red)
  const totalsChartConfig = useMemo(() => ({
    enrolled: { label: "Enrolled", color: COLOR_GREEN },
    failed: { label: "Failed", color: totalsPercent !== null ? getColorForPercent(totalsPercent) : COLOR_RED },
  }), [totalsPercent]);

  // Colors for category chart
  const categoryChartColors = {
    GREEN: COLOR_GREEN,
    YELLOW: COLOR_YELLOW,
    RED: COLOR_RED,
  };

  const categoryChartConfig = {
    GREEN: { label: "GREEN", color: categoryChartColors.GREEN },
    YELLOW: { label: "YELLOW", color: categoryChartColors.YELLOW },
    RED: { label: "RED", color: categoryChartColors.RED },
  };

  // Total teachers for the selected period (for percentage display)
  const totalTeachersSelected = useMemo(() => {
    const rows = (summary || []).filter((row) => row.period !== 'SEMESTRAL');
    if (filters.period === 'All') {
      // Use actual count of teachers loaded to avoid mismatched denominators
      return (teachers || []).length;
    }
    const match = rows.find((r) => r.period === filters.period);
    return match ? Number(match.total_teachers || 0) : 0;
  }, [summary, filters.period, teachers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold">Loading Faculty Deliberation System</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Faculty Deliberation System</h1>
              <p className="text-xs text-muted-foreground">Performance Analytics & Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/teachers')}>
              <Users className="h-4 w-4 mr-2" />
              Manage Teachers
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teachers.length}</div>
              <p className="text-xs text-muted-foreground">Active faculty members</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Green Zone</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{consistentCounts.green}</div>
              <p className="text-xs text-muted-foreground">
                {totalTeachersSelected > 0 ? `${((consistentCounts.green / totalTeachersSelected) * 100).toFixed(1)}%` : '0%'} of total
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-yellow-200 dark:border-yellow-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yellow Zone</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{consistentCounts.yellow}</div>
              <p className="text-xs text-muted-foreground">
                {totalTeachersSelected > 0 ? `${((consistentCounts.yellow / totalTeachersSelected) * 100).toFixed(1)}%` : '0%'} of total
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-red-200 dark:border-red-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Red Zone</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{consistentCounts.red}</div>
              <p className="text-xs text-muted-foreground">
                {totalTeachersSelected > 0 ? `${((consistentCounts.red / totalTeachersSelected) * 100).toFixed(1)}%` : '0%'} of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
                <CardDescription>Filter and search faculty performance data</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={generateReport} disabled={loadingSummary}>
                  {loadingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="search">Search Teachers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={filters.program} onValueChange={(v) => setFilters((f) => ({ ...f, program: v === '__ALL__' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Programs</SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.program_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>School Year</Label>
                <Select value={filters.schoolYear} onValueChange={(v) => setFilters((f) => ({ ...f, schoolYear: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="School Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={filters.semester} onValueChange={(v) => setFilters((f) => ({ ...f, semester: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={filters.period} onValueChange={(v) => setFilters((f) => ({ ...f, period: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Periods</SelectItem>
                    <SelectItem value="P1">Period 1</SelectItem>
                    <SelectItem value="P2">Period 2</SelectItem>
                    <SelectItem value="P3">Period 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {errorSummary && (
              <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorSummary}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Failure Percent Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Top 10 Failure Percent by Teacher</CardTitle>
                <CardDescription>Sorted by highest failure percentage for {filters.period}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">
                {filters.period} Period
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ChartContainer config={percentChartConfig}>
                <BarChart data={top10Data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="teacher" 
                    hide={isMobile} 
                    tick={{ fontSize: 10 }} 
                    interval={0} 
                    angle={-30} 
                    dy={20}
                    className="text-xs"
                  />
                  <YAxis tickFormatter={(v) => `${v}%`} className="text-xs" />
                  <ChartTooltip 
                    content={<ChartTooltipContent nameKey="percent" formatter={(value) => [`${value.toFixed(2)}%`, "Failure %"]} />} 
                  />
                  <Bar dataKey="percent" radius={[8, 8, 0, 0]}>
                    {top10Data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColorForPercent(entry.percent)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Report Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Teacher Summary Level Report</CardTitle>
            <CardDescription>Aggregated counts by zone per period; updates automatically with filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Period</TableHead>
                      <TableHead className="font-semibold">Total Teachers</TableHead>
                      <TableHead className="font-semibold text-green-600 dark:text-green-400">Green Zone</TableHead>
                      <TableHead className="font-semibold text-green-600 dark:text-green-400">% Green</TableHead>
                      <TableHead className="font-semibold text-yellow-600 dark:text-yellow-400">Yellow Zone</TableHead>
                      <TableHead className="font-semibold text-yellow-600 dark:text-yellow-400">% Yellow</TableHead>
                      <TableHead className="font-semibold text-red-600 dark:text-red-400">Red Zone</TableHead>
                      <TableHead className="font-semibold text-red-600 dark:text-red-400">% Red</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(summary || []).filter((row) => row.period !== 'SEMESTRAL').map((row) => (
                      <TableRow key={row.period} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{row.period}</TableCell>
                        <TableCell>{row.total_teachers ?? '—'}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">{row.green_count ?? '—'}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">
                          {typeof row.green_percent === 'number' ? `${row.green_percent.toFixed(2)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-yellow-600 dark:text-yellow-400">{row.yellow_count ?? '—'}</TableCell>
                        <TableCell className="text-yellow-600 dark:text-yellow-400">
                          {typeof row.yellow_percent === 'number' ? `${row.yellow_percent.toFixed(2)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-red-600 dark:text-red-400">{row.red_count ?? '—'}</TableCell>
                        <TableCell className="text-red-600 dark:text-red-400">
                          {typeof row.red_percent === 'number' ? `${row.red_percent.toFixed(2)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {summary.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No records found for the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Zone Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card 
                onClick={() => { setZoneModalZone('green'); setZoneModalOpen(true); }} 
                className="cursor-pointer hover:shadow-lg transition-all border-green-200 dark:border-green-900 hover:border-green-300 dark:hover:border-green-800"
              >
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Consistent Green Zone</div>
                  <div className="text-3xl font-bold text-green-600 mb-1">{consistentCounts.green}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalTeachersSelected > 0 ? `${((consistentCounts.green / totalTeachersSelected) * 100).toFixed(2)}%` : '—'} of total
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                onClick={() => { setZoneModalZone('yellow'); setZoneModalOpen(true); }} 
                className="cursor-pointer hover:shadow-lg transition-all border-yellow-200 dark:border-yellow-900 hover:border-yellow-300 dark:hover:border-yellow-800"
              >
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Consistent Yellow Zone</div>
                  <div className="text-3xl font-bold text-yellow-600 mb-1">{consistentCounts.yellow}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalTeachersSelected > 0 ? `${((consistentCounts.yellow / totalTeachersSelected) * 100).toFixed(2)}%` : '—'} of total
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                onClick={() => { setZoneModalZone('red'); setZoneModalOpen(true); }} 
                className="cursor-pointer hover:shadow-lg transition-all border-red-200 dark:border-red-900 hover:border-red-300 dark:hover:border-red-800"
              >
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Consistent Red Zone</div>
                  <div className="text-3xl font-bold text-red-600 mb-1">{consistentCounts.red}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalTeachersSelected > 0 ? `${((consistentCounts.red / totalTeachersSelected) * 100).toFixed(2)}%` : '—'} of total
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Department Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Zone Distribution by Department ({filters.period})</CardTitle>
            <CardDescription>GREEN vs YELLOW vs RED per department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ChartContainer config={{ green: { label: 'GREEN' }, yellow: { label: 'YELLOW' }, red: { label: 'RED' } }}>
                <BarChart data={deptChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="department" className="text-xs" angle={-30} dy={20} />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="green" fill="#22c55e" stackId="zones" radius={[8,8,0,0]} />
                  <Bar dataKey="yellow" fill="#facc15" stackId="zones" radius={[8,8,0,0]} />
                  <Bar dataKey="red" fill="#ef4444" stackId="zones" radius={[8,8,0,0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Category Distribution ({filters.period})</CardTitle>
              <CardDescription>GREEN vs YELLOW vs RED across teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] flex items-center justify-center">
                <ChartContainer config={categoryChartConfig}>
                  <PieChart>
                    <Pie 
                      data={categoryDistribution} 
                      dataKey="value" 
                      nameKey="name" 
                      outerRadius={isMobile ? 80 : 120} 
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={categoryChartColors[entry.name]} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Total Enrolled vs Failed ({filters.period})</CardTitle>
              <CardDescription>Enrolled vs Failed totals comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ChartContainer config={totalsChartConfig}>
                  <BarChart data={totalsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="enrolled" fill="var(--color-enrolled)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="failed" fill="var(--color-failed)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Zone Modal */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {zoneModalZone === 'green' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {zoneModalZone === 'yellow' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
              {zoneModalZone === 'red' && <AlertCircle className="h-5 w-5 text-red-600" />}
              {zoneModalZone ? `${zoneModalZone[0].toUpperCase()}${zoneModalZone.slice(1)} Zone Teachers` : 'Zone'} ({filters.period})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="font-semibold">Teacher Name</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Enrolled</TableHead>
                    <TableHead className="font-semibold">Failed</TableHead>
                    <TableHead className="font-semibold">Failure %</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zoneTeachers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No teachers found in this zone
                      </TableCell>
                    </TableRow>
                  )}
                  {zoneTeachers.map((t, i) => {
                    const enrolled = Number(t.enrolled_students) || 0;
                    const computePctFor = (pk) => percentFromData(t[`${pk}_percent`], t[`${pk}_failed`], enrolled);
                    const pkSelected = (() => {
                      if (filters.period === 'All') {
                        const candidates = (['p1','p2','p3']).map((pk) => ({ pk, pct: computePctFor(pk) ?? 0 }));
                        candidates.sort((a,b) => b.pct - a.pct);
                        return candidates[0].pk;
                      }
                      return filters.period.toLowerCase();
                    })();
                    const failed = Number(t[`${pkSelected}_failed`]) || 0;
                    const percent = computePctFor(pkSelected);
                    const cat = (percent !== null && percent !== undefined) ? categoryFromPercentValue(percent) : String(t[`${pkSelected}_category`] || '').trim();
                    const zoneColor = percent !== null ? getColorForPercent(percent) : COLOR_RED;
                    
                    return (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{t.first_name} {t.last_name}</TableCell>
                        <TableCell>{t.department || '—'}</TableCell>
                        <TableCell>{enrolled}</TableCell>
                        <TableCell>{failed}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: zoneColor, 
                              color: zoneColor,
                              backgroundColor: `${zoneColor}15`
                            }}
                          >
                            {typeof percent === 'number' && isFinite(percent) ? `${percent.toFixed(2)}%` : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              cat.includes('GREEN') ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950' :
                              cat.includes('YELLOW') ? 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950' :
                              'border-red-500 text-red-600 bg-red-50 dark:bg-red-950'
                            }
                          >
                            {cat || '—'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherReports;
