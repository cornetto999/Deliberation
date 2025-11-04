import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Edit, Eye, Loader2, GraduationCap, Users, AlertTriangle } from "lucide-react";
import { Upload, Download } from "lucide-react";
import ZoneBadge from "@/components/ZoneBadge";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
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

  const [newProgram, setNewProgram] = useState({
    program_code: "",
    program_name: "",
    description: "",
    duration_years: 4
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('programs.php'));
      const data = await response.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: "Error",
        description: "Failed to load programs data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter(program => {
    return program.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           program.program_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleAddProgram = async () => {
    if (!newProgram.program_code || !newProgram.program_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(apiUrl('programs.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProgram),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Program added successfully"
        });
        setNewProgram({
          program_code: "",
          program_name: "",
          description: "",
          duration_years: 4
        });
        setIsAddDialogOpen(false);
        fetchPrograms();
      } else {
        throw new Error('Failed to add program');
      }
    } catch (error) {
      console.error('Error adding program:', error);
      toast({
        title: "Error",
        description: "Failed to add program",
        variant: "destructive"
      });
    }
  };

  const handleEditProgram = (program) => {
    setSelectedProgram(program);
    setIsEditDialogOpen(true);
  };

  const handleViewProgram = (program) => {
    setSelectedProgram(program);
    setIsViewDialogOpen(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
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
      formData.append('type', 'Programs');

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
        toast({ title: "Upload successful", description: result.message });
        fetchPrograms();
      } else {
        toast({ title: "Upload failed", description: result.error || 'Failed to upload file', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: "Upload failed", description: "Network error occurred during upload", variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "program_code,program_name,description,duration_years\n" +
      "BSCS,Bachelor of Science in Computer Science,4-year computer science program,4\n" +
      "BSIT,Bachelor of Science in Information Technology,4-year IT program,4";

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getProgramZone = (program) => {
    const total = program.student_count;
    if (total === 0) return 'green';
    const redPercentage = (program.red_zone_count / total) * 100;
    const yellowPercentage = (program.yellow_zone_count / total) * 100;
    
    if (redPercentage > 20) return 'red';
    if (redPercentage > 10 || yellowPercentage > 30) return 'yellow';
    return 'green';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading programs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Programs</h1>
          <p className="text-muted-foreground">
            Manage academic programs and track student performance
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Program</DialogTitle>
              <DialogDescription>
                Enter program information below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="program_code">Program Code</Label>
                  <Input
                    id="program_code"
                    value={newProgram.program_code}
                    onChange={(e) => setNewProgram({...newProgram, program_code: e.target.value})}
                    placeholder="BSCRIM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_years">Duration (Years)</Label>
                  <Select 
                    value={newProgram.duration_years.toString()} 
                    onValueChange={(value) => setNewProgram({...newProgram, duration_years: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map((years) => (
                        <SelectItem key={years} value={years.toString()}>
                          {years} years
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="program_name">Program Name</Label>
                <Input
                  id="program_name"
                  value={newProgram.program_name}
                  onChange={(e) => setNewProgram({...newProgram, program_name: e.target.value})}
                  placeholder="Bachelor of Science in Criminology"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  placeholder="Program description..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProgram}>
                  Add Program
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find programs by name, code, or description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Program List</CardTitle>
          <CardDescription>
            {filteredPrograms.length} programs found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Code</TableHead>
                <TableHead>Program Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">
                    {program.program_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      {program.program_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {program.duration_years} years
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Total: {program.student_count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Green: {program.green_zone_count} | Yellow: {program.yellow_zone_count} | Red: {program.red_zone_count}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        At Risk: {program.red_zone_count + program.yellow_zone_count}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ZoneBadge zone={getProgramZone(program)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProgram(program)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleViewProgram(program)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Program Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{programs.length}</div>
            <p className="text-xs text-muted-foreground">Total Programs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {programs.reduce((sum, p) => sum + p.student_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {programs.filter(p => getProgramZone(p) === 'red').length}
            </div>
            <p className="text-xs text-muted-foreground">Programs Needing Attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {programs.filter(p => getProgramZone(p) === 'green').length}
            </div>
            <p className="text-xs text-muted-foreground">High Performing Programs</p>
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Program Details</DialogTitle>
            <DialogDescription>
              Complete program information.
            </DialogDescription>
          </DialogHeader>
          {selectedProgram && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Program Code:</span>
                  <div>{selectedProgram.program_code}</div>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <div>{selectedProgram.duration_years} years</div>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Program Name:</span>
                  <div>{selectedProgram.program_name}</div>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Description:</span>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedProgram.description || "No description available"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Total Students:</span>
                  <div>{selectedProgram.student_count}</div>
                </div>
                <div>
                  <span className="font-medium">Performance Zone:</span>
                  <div><ZoneBadge zone={getProgramZone(selectedProgram)} /></div>
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

export default Programs;


