import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ZoneBadge from "@/components/ZoneBadge";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    atRiskStudents: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    zoneDistribution: { green: 0, yellow: 0, red: 0 }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      const studentsResponse = await fetch(apiUrl('students.php'));
      let students = [];
      try {
        const ct = studentsResponse.headers.get('content-type') || '';
        if (studentsResponse.ok && ct.includes('application/json')) {
          const parsed = await studentsResponse.json();
          students = Array.isArray(parsed) ? parsed : [];
        }
      } catch (_) {
        students = [];
      }

      const teachersResponse = await fetch(apiUrl('teachers.php'));
      let teachers = [];
      try {
        const ct = teachersResponse.headers.get('content-type') || '';
        if (teachersResponse.ok && ct.includes('application/json')) {
          const parsed = await teachersResponse.json();
          teachers = Array.isArray(parsed) ? parsed : [];
        }
      } catch (_) {
        teachers = [];
      }

      const subjectsResponse = await fetch(apiUrl('subjects.php'));
      let subjects = [];
      try {
        const ct = subjectsResponse.headers.get('content-type') || '';
        if (subjectsResponse.ok && ct.includes('application/json')) {
          const parsed = await subjectsResponse.json();
          subjects = Array.isArray(parsed) ? parsed : [];
        }
      } catch (_) {
        subjects = [];
      }

      const totalStudents = students.length;
      const atRiskStudents = students.filter((s) => s.at_risk).length;
      const totalTeachers = teachers.length;
      const totalSubjects = subjects.length;

      const zoneDistribution = {
        green: students.filter((s) => s.zone === 'green').length,
        yellow: students.filter((s) => s.zone === 'yellow').length,
        red: students.filter((s) => s.zone === 'red').length,
      };

      setStats({
        totalStudents,
        atRiskStudents,
        totalTeachers,
        totalSubjects,
        zoneDistribution
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReports = () => {
    toast({
      title: "Generating reports",
      description: "Academic reports are being prepared..."
    });
  };

  const handleReviewAtRisk = () => {
    toast({
      title: "Reviewing at-risk students",
      description: "Opening at-risk student analysis..."
    });
  };

  const handleUpdateZones = () => {
    toast({
      title: "Updating zones",
      description: "Performance zones are being recalculated..."
    });
  };

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: GraduationCap,
      description: "Enrolled students",
      trend: "up"
    },
    {
      title: "At Risk Students",
      value: stats.atRiskStudents,
      icon: AlertTriangle,
      description: "Need intervention",
      trend: "down"
    },
    {
      title: "Total Teachers",
      value: stats.totalTeachers,
      icon: Users,
      description: "Active faculty",
      trend: "up"
    },
    {
      title: "Total Subjects",
      value: stats.totalSubjects,
      icon: BookOpen,
      description: "Courses offered",
      trend: "up"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold">Loading dashboard data...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch the metrics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of student performance and academic metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
          
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <TrendIcon className="h-3 w-3" />
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Zone Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Zone Distribution</CardTitle>
            <CardDescription>
              Student performance by zone classification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <ZoneBadge zone="green" />
                <span className="text-sm font-medium">Performing Well</span>
              </div>
              <Badge variant="secondary" className="font-semibold">{stats.zoneDistribution.green} students</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <ZoneBadge zone="yellow" />
                <span className="text-sm font-medium">Needs Attention</span>
              </div>
              <Badge variant="secondary" className="font-semibold">{stats.zoneDistribution.yellow} students</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <ZoneBadge zone="red" />
                <span className="text-sm font-medium">Critical Intervention</span>
              </div>
              <Badge variant="secondary" className="font-semibold">{stats.zoneDistribution.red} students</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common deliberation tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto p-4 hover:bg-accent hover:border-accent-foreground/20"
              onClick={handleGenerateReports}
            >
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">Generate Reports</div>
                <div className="text-xs text-muted-foreground">
                  Create comprehensive academic reports
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto p-4 hover:bg-accent hover:border-accent-foreground/20"
              onClick={handleReviewAtRisk}
            >
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="text-left">
                <div className="text-sm font-medium">Review At-Risk Students</div>
                <div className="text-xs text-muted-foreground">
                  {stats.atRiskStudents} students need review
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto p-4 hover:bg-accent hover:border-accent-foreground/20"
              onClick={handleUpdateZones}
            >
              <RefreshCw className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">Update Zone Classifications</div>
                <div className="text-xs text-muted-foreground">
                  Refresh performance zones
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and changes in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-2.5 h-2.5 bg-accent rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <span className="text-sm font-medium">Sarah Williams moved to Red Zone</span>
                <span className="text-xs text-muted-foreground ml-2">2 hours ago</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <span className="text-sm font-medium">New batch of students uploaded via CSV</span>
                <span className="text-xs text-muted-foreground ml-2">4 hours ago</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <span className="text-sm font-medium">Emma Johnson achieved Green Zone status</span>
                <span className="text-xs text-muted-foreground ml-2">1 day ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

