import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Eye, Loader2, BookOpen, User, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

const Grades = () => {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [semester, setSemester] = useState("1st");
  const { toast } = useToast();

  // Generate academic years from 2023 to present
  const currentYear = new Date().getFullYear();
  const academicYears = [];
  for (let year = 2023; year <= currentYear; year++) {
    academicYears.push(`${year}-${year + 1}`);
  }

  const [newGrade, setNewGrade] = useState({
    student_id: "",
    subject_id: "",
    academic_year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    semester: "1st",
    midterm_grade: "",
    final_grade: "",
    final_rating: "",
    status: "Failed"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gradesRes, studentsRes, subjectsRes] = await Promise.all([
        fetch(apiUrl('grades.php')),
        fetch(apiUrl('students.php')),
        fetch(apiUrl('subjects.php'))
      ]);
      
      const [gradesData, studentsData, subjectsData] = await Promise.all([
        gradesRes.json(),
        studentsRes.json(),
        subjectsRes.json()
      ]);
      
      setGrades(gradesData);
      setStudents(studentsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGrades = grades.filter(grade => {
    const matchesSearch = 
      grade.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.student_id_str.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "passed") return matchesSearch && grade.status === "Passed";
    if (activeTab === "failed") return matchesSearch && grade.status === "Failed";
    if (activeTab === "incomplete") return matchesSearch && grade.status === "Incomplete";
    
    return matchesSearch;
  });

  const handleAddGrade = async () => {
    if (!newGrade.student_id || !newGrade.subject_id) {
      toast({
        title: "Error",
        description: "Please select both student and subject",
        variant: "destructive"
      });
      return;
    }

    try {
      const gradeData = {
        ...newGrade,
        student_id: parseInt(newGrade.student_id),
        subject_id: parseInt(newGrade.subject_id),
        midterm_grade: newGrade.midterm_grade ? parseFloat(newGrade.midterm_grade) : null,
        final_grade: newGrade.final_grade ? parseFloat(newGrade.final_grade) : null,
        final_rating: newGrade.final_rating ? parseFloat(newGrade.final_rating) : null,
      };

      const response = await fetch(apiUrl('grades.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gradeData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Grade added successfully"
        });
        setNewGrade({
          student_id: "",
          subject_id: "",
          academic_year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
          semester: "1st",
          midterm_grade: "",
          final_grade: "",
          final_rating: "",
          status: "Failed"
        });
        setIsAddDialogOpen(false);
        fetchData();
      } else {
        throw new Error('Failed to add grade');
      }
    } catch (error) {
      console.error('Error adding grade:', error);
      toast({
        title: "Error",
        description: "Failed to add grade",
        variant: "destructive"
      });
    }
  };

  const handleEditGrade = (grade) => {
    setSelectedGrade(grade);
    setIsEditDialogOpen(true);
  };

  const handleViewGrade = (grade) => {
    setSelectedGrade(grade);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Passed":
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case "Failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "Incomplete":
        return <Badge className="bg-yellow-100 text-yellow-800">Incomplete</Badge>;
      case "Dropped":
        return <Badge className="bg-gray-100 text-gray-800">Dropped</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getGradeColor = (grade) => {
    if (!grade) return "text-muted-foreground";
    if (grade >= 90) return "text-green-600 font-semibold";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    if (grade >= 60) return "text-orange-600";
    return "text-red-600 font-semibold";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading grades...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Grades</h1>
          <p className="text-muted-foreground">
            Manage student grades and academic performance tracking
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Grade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Grade</DialogTitle>
              <DialogDescription>
                Enter grade information below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student</Label>
                  <Select 
                    value={newGrade.student_id} 
                    onValueChange={(value) => setNewGrade({...newGrade, student_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.student_id} - {student.first_name} {student.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject_id">Subject</Label>
                  <Select 
                    value={newGrade.subject_id} 
                    onValueChange={(value) => setNewGrade({...newGrade, subject_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.subject_code} - {subject.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={newGrade.academic_year}
                    onChange={(e) => setNewGrade({...newGrade, academic_year: e.target.value})}
                    placeholder="2024-2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select 
                    value={newGrade.semester} 
                    onValueChange={(value) => setNewGrade({...newGrade, semester: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Semester</SelectItem>
                      <SelectItem value="2nd">2nd Semester</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="midterm_grade">Midterm Grade</Label>
                  <Input
                    id="midterm_grade"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newGrade.midterm_grade}
                    onChange={(e) => setNewGrade({...newGrade, midterm_grade: e.target.value})}
                    placeholder="85.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final_grade">Final Grade</Label>
                  <Input
                    id="final_grade"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newGrade.final_grade}
                    onChange={(e) => setNewGrade({...newGrade, final_grade: e.target.value})}
                    placeholder="88.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final_rating">Final Rating</Label>
                  <Input
                    id="final_rating"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newGrade.final_rating}
                    onChange={(e) => setNewGrade({...newGrade, final_rating: e.target.value})}
                    placeholder="87.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newGrade.status} 
                  onValueChange={(value) => setNewGrade({...newGrade, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Incomplete">Incomplete</SelectItem>
                    <SelectItem value="Dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddGrade}>
                  Add Grade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Academic Year and Semester Selectors */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Academic Year:</span>
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {String(year)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Semester:</span>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st">1st</SelectItem>
              <SelectItem value="2nd">2nd</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find grades by student, subject, or other criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search grades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grades Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Records</CardTitle>
          <CardDescription>
            {filteredGrades.length} grades found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Grades</TabsTrigger>
              <TabsTrigger value="passed">Passed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Midterm</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{grade.first_name} {grade.last_name}</div>
                            <div className="text-sm text-muted-foreground">{grade.student_id_str}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{grade.subject_code}</div>
                            <div className="text-sm text-muted-foreground">{grade.subject_name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{grade.academic_year}</div>
                          <div className="text-muted-foreground">{grade.semester}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={getGradeColor(grade.midterm_grade)}>
                          {grade.midterm_grade ? grade.midterm_grade.toFixed(1) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getGradeColor(grade.final_grade)}>
                          {grade.final_grade ? grade.final_grade.toFixed(1) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getGradeColor(grade.final_rating)}>
                          {grade.final_rating ? grade.final_rating.toFixed(1) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(grade.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditGrade(grade)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleViewGrade(grade)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Grade Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{grades.length}</div>
            <p className="text-xs text-muted-foreground">Total Grades</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">
              {grades.filter(g => g.status === 'Passed').length}
            </div>
            <p className="text-xs text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-red-600">
              {grades.filter(g => g.status === 'Failed').length}
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {grades.length > 0 ? (grades.filter(g => g.status === 'Passed').length / grades.length * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Details</DialogTitle>
            <DialogDescription>
              Complete grade information.
            </DialogDescription>
          </DialogHeader>
          {selectedGrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Student:</span>
                  <div>{selectedGrade.first_name} {selectedGrade.last_name}</div>
                  <div className="text-muted-foreground">{selectedGrade.student_id_str}</div>
                </div>
                <div>
                  <span className="font-medium">Subject:</span>
                  <div>{selectedGrade.subject_code}</div>
                  <div className="text-muted-foreground">{selectedGrade.subject_name}</div>
                </div>
                <div>
                  <span className="font-medium">Academic Year:</span>
                  <div>{selectedGrade.academic_year}</div>
                </div>
                <div>
                  <span className="font-medium">Semester:</span>
                  <div>{selectedGrade.semester}</div>
                </div>
                <div>
                  <span className="font-medium">Midterm Grade:</span>
                  <div className={getGradeColor(selectedGrade.midterm_grade)}>
                    {selectedGrade.midterm_grade ? selectedGrade.midterm_grade.toFixed(1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Final Grade:</span>
                  <div className={getGradeColor(selectedGrade.final_grade)}>
                    {selectedGrade.final_grade ? selectedGrade.final_grade.toFixed(1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Final Rating:</span>
                  <div className={getGradeColor(selectedGrade.final_rating)}>
                    {selectedGrade.final_rating ? selectedGrade.final_rating.toFixed(1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div>{getStatusBadge(selectedGrade.status)}</div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grades;


