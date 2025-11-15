import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Stack,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  CircularProgress
} from "@mui/material";
import axios from "axios";

export default function IncidentForm() {
  const { sys_id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  
  useEffect(() => {
    async function fetchIncident() {
      try {
        const res = await axios.get(
          `http://localhost:3001/api/incidents/${sys_id}`,
          { withCredentials: true }
        );
        setIncident(res.data.result);
        console.log(res.data.result);
      } catch (err) {
        console.error("Failed to load incident:", err);
      }
      setLoading(false);
    }

    fetchIncident();
  }, [sys_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `http://localhost:3001/api/incidents/${sys_id}`,
        incident,
        { withCredentials: true }
      );
      alert("Incident updated successfully!");
      navigate("/");  // redirect back to home
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to update incident");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Stack alignItems="center" mt={8}>
        <CircularProgress />
        <Typography mt={2}>Loading Incident...</Typography>
      </Stack>
    );
  }

  if (!incident) {
    return <Typography variant="h5">Incident not found</Typography>;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 600, mx: "auto", mt: 5 }}>

     
      <Typography variant="h4" fontWeight="bold" color="primary.main">
        Incident Form
      </Typography>

     
      <Typography variant="h6" sx={{ opacity: 0.7 }}>
        Number: {incident.number}
      </Typography>

      <Card sx={{ p: 2 }}>
        <CardContent>

       
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Impact</InputLabel>
            <Select
              label="Impact"
              value={incident.impact}
              onChange={(e) => setIncident({ ...incident, impact: e.target.value })}
            >
              <MenuItem value="1">1 - High</MenuItem>
              <MenuItem value="2">2 - Medium</MenuItem>
              <MenuItem value="3">3 - Low</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Urgency</InputLabel>
            <Select
              label="Urgency"
              value={incident.urgency}
              onChange={(e) => setIncident({ ...incident, urgency: e.target.value })}
            >
              <MenuItem value="1">1 - High</MenuItem>
              <MenuItem value="2">2 - Medium</MenuItem>
              <MenuItem value="3">3 - Low</MenuItem>
            </Select>
          </FormControl>

          
          <TextField
            label="Short Description"
            fullWidth
            sx={{ mb: 2 }}
            value={incident.short_description || ""}
            onChange={(e) =>
              setIncident({ ...incident, short_description: e.target.value })
            }
          />

         
          <TextField
            label="Description"
            fullWidth
            sx={{ mb: 2 }}
            multiline
            rows={3}
            value={incident.description || ""}
            onChange={(e) =>
              setIncident({ ...incident, description: e.target.value })
            }
          />

          

          
          <TextField
            label="Work Notes"
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
            value={incident.work_notes || ""}
            onChange={(e) =>
              setIncident({ ...incident, work_notes: e.target.value })
            }
          />

         
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>

         
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>

        </CardContent>
      </Card>
    </Stack>
  );
}
