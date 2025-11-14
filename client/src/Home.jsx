

import {
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import axios from "axios";
import LoginCard from "./LoginCard";
import { useNavigate } from "react-router-dom";


export default function Home() {
  const { isLogged } = useContext(AuthContext);
  const theme = useTheme();

  const [incidents, setIncidents] = useState([]);

  // Search states
  const [inputSearch, setInputSearch] = useState("");
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    impact: "",
    urgency: "",
    short_description: "",
  });

  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (isLogged) {
        try {
          const incidentList = await axios.get(
            "http://localhost:3001/api/incidents",
            { withCredentials: true }
          );
          setIncidents(incidentList.data.result || []);
        } catch (err) {
          console.error("Failed to fetch incidents:", err);
        }
      }
    }
    fetchData();
  }, [isLogged]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await axios.put(
          `http://localhost:3001/api/incidents/${editing}`,
          formData,
          { withCredentials: true }
        );
        alert("Incident updated successfully!");
      } else {
        await axios.post("http://localhost:3001/api/incidents", formData, {
          withCredentials: true,
        });
        alert("Incident inserted successfully!");
      }

      const res = await axios.get("http://localhost:3001/api/incidents", {
        withCredentials: true,
      });
      setIncidents(res.data.result || []);
      setFormData({ impact: "", urgency: "", short_description: "" });
      setEditing(null);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save incident.");
    }
  };

  const handleDelete = async (sys_id) => {
    try {
      await axios.delete(`http://localhost:3001/api/incidents/${sys_id}`, {
        withCredentials: true,
      });
      setIncidents((prev) => prev.filter((inc) => inc.sys_id !== sys_id));
      alert("Incident deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete incident.");
    }
  };

  const handleEdit = (inc) => {
    setFormData({
      impact: inc.impact || "",
      urgency: inc.urgency || "",
      short_description: inc.short_description || "",
    });
    setEditing(inc.sys_id);
  };

  return (
    <>
      {isLogged && (
        <Stack spacing={3}>

          {/* TITLE + SEARCH BAR */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography 
              variant="h4" 
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              Incident Management
            </Typography>

            {/* ENTER-TO-SEARCH */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(inputSearch);
              }}
              style={{ width: "350px" }}
            >
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: "50px",
                  px: 2,
                  py: 1,
                  width: "100%",
                  boxShadow: theme.shadows[3],
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                {/* Icon */}
                <svg
                  width="20"
                  height="20"
                  fill="currentColor"
                  style={{ marginRight: 10, color: theme.palette.text.secondary }}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 
                  6.5 6.5 0 109.5 16c1.61 0 3.09-.59 
                  4.23-1.57l.27.28v.79l5 4.99L20.49 
                  19l-4.99-5zM9.5 14C7.01 14 5 
                  11.99 5 9.5S7.01 5 9.5 5 14 
                  7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>

                {/* Search Input */}
                <TextField
                  placeholder="Search incidents…"
                  variant="standard"
                  value={inputSearch}
                  onChange={(e) => setInputSearch(e.target.value)}
                  InputProps={{ disableUnderline: true }}
                  sx={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setSearch(inputSearch);
                    }
                  }}
                />
              </Stack>
            </form>
          </Stack>

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            <Stack
              direction="row"
              spacing={3}
              alignItems="center"
              justifyContent="center"
            >
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Impact</InputLabel>
                <Select
                  label="Impact"
                  name="impact"
                  value={formData.impact}
                  onChange={handleChange}
                >
                  <MenuItem value="1">1 - High</MenuItem>
                  <MenuItem value="2">2 - Medium</MenuItem>
                  <MenuItem value="3">3 - Low</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Urgency</InputLabel>
                <Select
                  label="Urgency"
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                >
                  <MenuItem value="1">1 - High</MenuItem>
                  <MenuItem value="2">2 - Medium</MenuItem>
                  <MenuItem value="3">3 - Low</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Short Description"
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                size="small"
                sx={{ width: 300 }}
              />

              <Button type="submit" variant="contained" color="primary">
                {editing ? "Update Incident" : "Insert Incident"}
              </Button>
            </Stack>
          </form>

          {/* CARDS */}
          <Grid container spacing={3}>
            {incidents
              .filter((inc) =>
                search === "" ||
                inc.short_description
                  ?.toLowerCase()
                  .includes(search.toLowerCase()) ||
                inc.number?.toLowerCase().includes(search.toLowerCase())
              )
              .map((inc) => (
                <Grid key={inc.sys_id} item>
                  <Card onClick={() => navigate(`/incident/${inc.sys_id}`)}
                    sx={{
                      width: 260,
                      height: 250,
                      borderRadius: 3,
                      boxShadow: 4,
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Typography fontWeight="bold" sx={{ mb: 1 }}>
                        ID: {inc.number}
                      </Typography>

                      <Typography sx={{ mb: 0.5 }}>
                        <strong>State:</strong> {inc.state}
                      </Typography>

                      <Typography sx={{ mb: 0.5 }}>
                        <strong>Priority:</strong> {inc.priority}
                      </Typography>

                      <Typography sx={{ mb: 0.5 }}>
                        <strong>Description:</strong> {inc.short_description}
                      </Typography>
                    </CardContent>

                    <Stack direction="row" spacing={1} sx={{ pb: 1, px: 1 }}>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        onClick={() => handleDelete(inc.sys_id)}
                        startIcon={<DeleteIcon />}
                      >
                        Delete
                      </Button>

                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => navigate(`/incident/${inc.sys_id}`)}
                        startIcon={<EditIcon />}
                      >
                        Edit
                      </Button>
                    </Stack>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Stack>
      )}

      {!isLogged && <LoginCard />}
    </>
  );
}


