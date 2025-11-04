import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Search, BookOpen, Edit, Eye, Loader2, Upload, Download } from "lucide-react";
import ZoneBadge from "@/components/ZoneBadge";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [semester, setSemester] = useState("1st");
  const { toast } = useToast();

  // Generate academic years from 2023 to present
  const currentYear = new Date().getFullYear();
  const academicYears = [];
  for (let year = 2023; year <= currentYear; year++) {
    academicYears.push(`${year}-${year + 1}`);
  }

  const [newSubject, setNewSubject] = useState({
    subject_code: "",
    subject_name: "",
    description: "",
    units: "",
    year_level: "",
    semester: "",
    program_id: "",
    cutoff_grade: "60"
  });

  // Fetch subjects from API
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('subjects.php'));
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subjects. Please check if the server is running.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter(subject =>
    subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.subject_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPassingRate = (subject) => {
    if (subject.enrolled_students === 0) return 0;
    return Math.round((subject.passing_students / subject.enrolled_students) * 100);
  };

  const getZone = (passRate) => {
    if (passRate >= 80) return "green";
    if (passRate >= 60) return "yellow";
    return "red";
  };

  const handleAddSubject = async () => {
    try {
      const response = await fetch(apiUrl('subjects.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject_code: newSubject.subject_code,
          subject_name: newSubject.subject_name,
          description: newSubject.description,
          units: parseInt(newSubject.units),
          year_level: parseInt(newSubject.year_level),
          semester: newSubject.semester,
          program_id: parseInt(newSubject.program_id),
          cutoff_grade: parseFloat(newSubject.cutoff_grade)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add subject');
      }

      await fetchSubjects();
      setNewSubject({
        subject_code: "",
        subject_name: "",
        description: "",
        units: "",
        year_level: "",
        semester: "",
        program_id: "",
        cutoff_grade: "60"
      });
      setIsAddDialogOpen(false);
      toast({
        title: "Subject added",
        description: "New subject has been added successfully."
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: "Error",
        description: "Failed to add subject. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditSubject = (subject) => {
    setSelectedSubject(subject);
    setIsEditDialogOpen(true);
  };

  const handleViewSubject = (subject) => {
    setSelectedSubject(subject);
    setIsViewDialogOpen(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV files. Excel files may require additional setup.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'Subjects');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(apiUrl('upload.php'), {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Upload successful",
          description: result.message,
        });
        // Refresh the subjects list
        fetchSubjects();
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload file",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Network error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "subject_code,subject_name,description,units,year_level,semester,program,cutoff\n" +
      "CS101,Introduction to Programming,Basic programming concepts,3,1,Y1S1,BSIT,60\n" +
      "CS102,Data Structures,Data structures and algorithms,3,1,Y1S2,BSIT,60\n" +
      "MATH101,Calculus I,Basic calculus,3,1,Y1S1,BSIT,60";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subjects_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-muted-foreground">
            Manage courses and track performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload CSV file"
            />
            <Button disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? `Uploading... ${uploadProgress}%` : "Upload CSV"}
            </Button>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Enter subject information below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject_code">Subject Code</Label>
                  <Input
                    id="subject_code"
                    value={newSubject.subject_code}
                    onChange={(e) => setNewSubject({...newSubject, subject_code: e.target.value})}
                    placeholder="ITE 101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_level">Year Level</Label>
                  <Select value={newSubject.year_level} onValueChange={(value) => setNewSubject({...newSubject, year_level: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          Year {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject_name">Subject Name</Label>
                <Input
                  id="subject_name"
                  value={newSubject.subject_name}
                  onChange={(e) => setNewSubject({...newSubject, subject_name: e.target.value})}
                  placeholder="Enter subject name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                  placeholder="Enter subject description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="units">Units</Label>
                  <Input
                    id="units"
                    type="number"
                    value={newSubject.units}
                    onChange={(e) => setNewSubject({...newSubject, units: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select value={newSubject.semester} onValueChange={(value) => setNewSubject({...newSubject, semester: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y1S1">Y1S1</SelectItem>
                      <SelectItem value="Y1S2">Y1S2</SelectItem>
                      <SelectItem value="Y2S1">Y2S1</SelectItem>
                      <SelectItem value="Y2S2">Y2S2</SelectItem>
                      <SelectItem value="Y3S1">Y3S1</SelectItem>
                      <SelectItem value="Y3S2">Y3S2</SelectItem>
                      <SelectItem value="Y4S1">Y4S1</SelectItem>
                      <SelectItem value="Y4S2">Y4S2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="program_id">Program</Label>
                  <Input
                    id="program_id"
                    type="number"
                    value={newSubject.program_id}
                    onChange={(e) => setNewSubject({...newSubject, program_id: e.target.value})}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutoff_grade">Pass Cutoff (%)</Label>
                  <Input
                    id="cutoff_grade"
                    type="number"
                    value={newSubject.cutoff_grade}
                    onChange={(e) => setNewSubject({...newSubject, cutoff_grade: e.target.value})}
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSubject}>
                  Add Subject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find subjects by name or code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subject List</CardTitle>
          <CardDescription>
            {filteredSubjects.length} subjects found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading subjects...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Year Level</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Passing</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((subject) => {
                  const passRate = getPassingRate(subject);
                  const zone = getZone(passRate);
                  return (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">
                        {subject.subject_code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          {subject.subject_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Year {subject.year_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {subject.semester}
                        </Badge>
                      </TableCell>
                      <TableCell>{subject.units}</TableCell>
                      <TableCell>{subject.enrolled_students}</TableCell>
                      <TableCell>{subject.passing_students}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{passRate}%</span>
                            <span className="text-muted-foreground">
                              {subject.cutoff_grade}% required
                            </span>
                          </div>
                          <Progress value={passRate} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <ZoneBadge zone={zone} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditSubject(subject)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleViewSubject(subject)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subject Performance Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {subjects.reduce((sum, s) => sum + s.enrolled_students, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total enrolled</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {subjects.length > 0 ? Math.round(
                (subjects.reduce((sum, s) => sum + s.passing_students, 0) /
                subjects.reduce((sum, s) => sum + s.enrolled_students, 0)) * 100
              ) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall pass rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {subjects.filter(s => getZone(getPassingRate(s)) === "red").length}
            </div>
            <p className="text-xs text-muted-foreground">Critical subjects</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject information.
            </DialogDescription>
          </DialogHeader>
          {selectedSubject && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Editing: {selectedSubject.subject_name} ({selectedSubject.subject_code})
              </div>
              <div className="space-y-2">
                <Label>Performance Zone</Label>
                <Select defaultValue={selectedSubject.zone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Green Zone</SelectItem>
                    <SelectItem value="yellow">Yellow Zone</SelectItem>
                    <SelectItem value="red">Red Zone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsEditDialogOpen(false)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subject Details</DialogTitle>
            <DialogDescription>
              Complete subject information.
            </DialogDescription>
          </DialogHeader>
          {selectedSubject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Subject Code:</span>
                  <div>{selectedSubject.subject_code}</div>
                </div>
                <div>
                  <span className="font-medium">Year Level:</span>
                  <div>Year {selectedSubject.year_level}</div>
                </div>
                <div>
                  <span className="font-medium">Semester:</span>
                  <div>{selectedSubject.semester}</div>
                </div>
                <div>
                  <span className="font-medium">Units:</span>
                  <div>{selectedSubject.units}</div>
                </div>
                <div>
                  <span className="font-medium">Enrolled:</span>
                  <div>{selectedSubject.enrolled_students} students</div>
                </div>
                <div>
                  <span className="font-medium">Passing:</span>
                  <div>{selectedSubject.passing_students} students</div>
                </div>
                <div>
                  <span className="font-medium">Pass Rate:</span>
                  <div>{getPassingRate(selectedSubject)}%</div>
                </div>
                <div>
                  <span className="font-medium">Cutoff:</span>
                  <div>{selectedSubject.cutoff_grade}%</div>
                </div>
                <div>
                  <span className="font-medium">Zone:</span>
                  <div><ZoneBadge zone={getZone(getPassingRate(selectedSubject))} /></div>
                </div>
                {selectedSubject.description && (
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span>
                    <div>{selectedSubject.description}</div>
                  </div>
                )}
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

export default Subjects;