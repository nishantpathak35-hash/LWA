'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Select, Badge, Dialog, Textarea,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../ui/core';
import {
  Clock, MapPin, Camera, CheckCircle2, AlertTriangle, 
  XCircle, RotateCcw, Calendar, History, ShieldAlert,
  ArrowRight, ShieldCheck, User, Building2, Eye, ExternalLink,
  ChevronRight, RefreshCw, Send, Check
} from 'lucide-react';

export default function MyAttendanceView() {
  const { user, projects: rawProjects, callRpc } = useAppState();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Profile and today's state
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [activeProject, setActiveProject] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [regularisations, setRegularisations] = useState([]);
  const [activeTab, setActiveTab] = useState('punch'); // 'punch' | 'history' | 'regularisations'

  // Live digital clock
  const [currentTime, setCurrentTime] = useState('');

  // Punch modal state
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchType, setPunchType] = useState('in'); // 'in' | 'out'
  const [selectedPunchProject, setSelectedPunchProject] = useState('');
  const [punchSubmitting, setPunchSubmitting] = useState(false);

  // Camera & Media stream
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const streamRef = useRef(null);

  // GPS Coordinates
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAddress, setGpsAddress] = useState('');
  const [gpsError, setGpsError] = useState(null);
  const gpsWatchIdRef = useRef(null);

  // Regularisation modal state
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regFormData, setRegFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project: '',
    proposed_punch_in: '09:00',
    proposed_punch_out: '18:00',
    reason: ''
  });
  const [submittingReg, setSubmittingReg] = useState(false);

  // View Past Punches Modals
  const [viewSelfieModal, setViewSelfieModal] = useState(null);
  const [viewMapModal, setViewMapModal] = useState(null);

  // Available project list
  const projectList = useMemo(() => {
    const set = new Set();
    if (Array.isArray(rawProjects)) {
      rawProjects.forEach(p => {
        const name = typeof p === 'string' ? p : p?.project || p?.name;
        if (name) set.add(name);
      });
    }
    return Array.from(set).sort();
  }, [rawProjects]);

  // Live Clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Attendance Data
  const loadAttendanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayData, historyData, regData] = await Promise.all([
        callRpc('getMyAttendanceToday'),
        callRpc('getMyAttendanceHistory', { limit: 30 }),
        callRpc('listAttendanceRegularisations', {})
      ]);

      if (todayData) {
        setEmployeeProfile(todayData.employee);
        setTodayRecord(todayData.record);
        const resolvedProj = todayData.activeProject || (projectList[0] || 'General Project');
        setActiveProject(resolvedProj);
        setSelectedPunchProject(resolvedProj);
        setRegFormData(prev => ({ ...prev, project: resolvedProj }));
      }
      if (Array.isArray(historyData)) {
        setHistoryRecords(historyData);
      }
      if (Array.isArray(regData)) {
        // Filter to this employee
        if (todayData?.employee?.employee_id) {
          setRegularisations(regData.filter(r => r.employee_id === todayData.employee.employee_id));
        } else {
          setRegularisations(regData);
        }
      }
    } catch (err) {
      console.error('Failed to load my attendance data:', err);
      setError(err.message || 'Failed to load attendance information');
    } finally {
      setLoading(false);
    }
  }, [callRpc, projectList]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // -------------------------------------------------------------
  // Camera & GPS Handling
  // -------------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setSelfiePreview(null);
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback without specific constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied. Please grant permission in your browser to verify selfie attendance.');
      setCameraActive(false);
    }
  }, []);

  const captureSelfie = useCallback(() => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      // Mirror image horizontally for standard selfie feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfiePreview(dataUrl);
      stopCamera();
    } catch (err) {
      console.error('Failed to capture selfie:', err);
      setCameraError('Failed to capture image snapshot. Please retry.');
    }
  }, [stopCamera]);

  const stopGpsWatching = useCallback(() => {
    if (gpsWatchIdRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setGpsLoading(false);
  }, []);

  const fetchGpsLocation = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device or browser.');
      setGpsLoading(false);
      return;
    }

    if (gpsWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }

    const onPositionSuccess = async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const roundedAcc = Math.round(accuracy);
      setGpsCoords(prev => {
        // If accuracy is better or new, update
        if (!prev || roundedAcc <= prev.accuracy) {
          return { latitude, longitude, accuracy: roundedAcc };
        }
        return prev;
      });
      setGpsLoading(false);

      // Reverse geocode via server RPC or fallback
      try {
        const geoRes = await callRpc('reverseGeocodeLocation', { latitude, longitude });
        if (geoRes && geoRes.address) {
          setGpsAddress(geoRes.address);
          return;
        }
      } catch { }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            setGpsAddress(data.display_name);
            return;
          }
        }
      } catch { }

      setGpsAddress(`${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`);
    };

    const onPositionError = (err) => {
      setGpsLoading(false);
      let errMsg = 'Unable to retrieve GPS coordinates. Please enable location permissions.';
      if (err.code === 1) errMsg = 'Location permission denied. Please allow location access in your browser settings.';
      else if (err.code === 2) errMsg = 'Location unavailable. Ensure GPS is turned ON on your device.';
      else if (err.code === 3) errMsg = 'GPS satellite lock timed out. Tap "Retry GPS" to re-acquire.';
      setGpsError(errMsg);
    };

    // Fast initial fix
    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      onPositionError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Continuous high-precision satellite tracking
    try {
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        onPositionSuccess,
        (err) => console.warn('GPS continuous watch warning:', err.message),
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
      );
    } catch (e) {
      console.warn('watchPosition error:', e);
    }
  }, [callRpc]);

  // Component unmount hardware cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      stopGpsWatching();
    };
  }, [stopCamera, stopGpsWatching]);

  // Clean re-attachment when switching back from selfie preview to active camera
  useEffect(() => {
    if (cameraActive && !selfiePreview && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.warn('Video attach play error:', e));
      }
    }
  }, [cameraActive, selfiePreview]);

  // When punch modal opens: start camera & fetch GPS
  const handleOpenPunchModal = (type) => {
    setPunchType(type);
    setPunchModalOpen(true);
    setSelfiePreview(null);
    fetchGpsLocation();
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  const handleClosePunchModal = () => {
    stopCamera();
    stopGpsWatching();
    setPunchModalOpen(false);
    setSelfiePreview(null);
    setGpsError(null);
    setCameraError(null);
  };

  // Submit Punch
  const handleSubmitPunch = async (allowFlagged = false) => {
    if (!selfiePreview) {
      setCameraError('Live selfie photograph is required.');
      return;
    }
    if (!gpsCoords || gpsCoords.latitude == null) {
      setGpsError('Exact GPS coordinates are required. Please wait for coordinates to lock or enable location access.');
      return;
    }

    setPunchSubmitting(true);
    try {
      const res = await callRpc('punchAttendance', {
        type: punchType,
        project: selectedPunchProject || activeProject || 'General Project',
        selfie: selfiePreview,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        accuracy: gpsCoords.accuracy,
        address: gpsAddress,
        allow_flagged: allowFlagged
      });

      setSuccessToast(
        `Punch ${punchType === 'in' ? 'In' : 'Out'} recorded successfully! Status: ${
          res.geoStatus === 'within_radius' ? 'Verified (Within Site Radius)' : 'Flagged (Outside Site Radius)'
        }`
      );
      handleClosePunchModal();
      await loadAttendanceData();
    } catch (err) {
      console.error('Punch submission failed:', err);
      const errMsg = err.message || 'Attendance punch submission failed. Please verify site and network.';
      if (errMsg.includes('PUNCH_BLOCKED')) {
        const confirmFlagged = window.confirm(
          `${errMsg}\n\nDo you want to submit your punch as Out-of-Site attendance for Manager Review?`
        );
        if (confirmFlagged) {
          setPunchSubmitting(false);
          return handleSubmitPunch(true);
        }
      }
      alert(errMsg);
    } finally {
      setPunchSubmitting(false);
    }
  };

  // Submit Regularisation Request
  const handleSubmitRegularisation = async (e) => {
    e.preventDefault();
    if (!employeeProfile?.employee_id) {
      alert('Employee profile is not linked to your user account.');
      return;
    }
    if (!regFormData.reason || !regFormData.reason.trim()) {
      alert('Please provide a legitimate reason for regularisation.');
      return;
    }

    setSubmittingReg(true);
    try {
      await callRpc('submitAttendanceRegularisation', {
        employee_id: employeeProfile.employee_id,
        project: regFormData.project || activeProject || 'General Project',
        date: regFormData.date,
        proposed_punch_in: regFormData.proposed_punch_in ? `${regFormData.date}T${regFormData.proposed_punch_in}:00` : null,
        proposed_punch_out: regFormData.proposed_punch_out ? `${regFormData.date}T${regFormData.proposed_punch_out}:00` : null,
        reason: regFormData.reason.trim()
      });

      setSuccessToast('Attendance correction request submitted for management review.');
      setRegModalOpen(false);
      setRegFormData(prev => ({ ...prev, reason: '' }));
      await loadAttendanceData();
    } catch (err) {
      console.error('Regularisation submission error:', err);
      alert(err.message || 'Failed to submit regularisation request.');
    } finally {
      setSubmittingReg(false);
    }
  };

  // Status helper
  const renderStatusBadge = (status, isFlagged) => {
    const s = String(status || '').toLowerCase();
    if (isFlagged) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Flagged</Badge>;
    }
    if (s === 'present' || s === 'checked_in') {
      return <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Present</Badge>;
    }
    if (s === 'half_day') {
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border border-amber-500/30">Half Day</Badge>;
    }
    if (s === 'late') {
      return <Badge variant="outline" className="border-amber-500/50 text-amber-500">Late Arrival</Badge>;
    }
    if (s === 'on_leave') {
      return <Badge variant="secondary">On Leave</Badge>;
    }
    return <Badge variant="secondary" className="text-muted-foreground">Absent</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            {employeeProfile?.photo_url ? (
              <img src={employeeProfile.photo_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">
                {employeeProfile?.name || user?.name || user?.email?.split('@')[0] || 'Employee'}
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono border-amber-500/30 text-amber-500">
                {employeeProfile?.employee_id || 'ID Pending'}
              </Badge>
              {employeeProfile?.status === 'active' && (
                <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 text-[10px] border-emerald-500/30">
                  Active Staff
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{employeeProfile?.designation || 'Site Team Member'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-foreground font-medium">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                {activeProject || 'Assigned to General Operations'}
              </span>
            </p>
          </div>
        </div>

        {/* Live Digital Clock & Refresh */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Live Site Clock</span>
            <span className="text-xl font-mono font-bold text-amber-500 tracking-tight">{currentTime || '--:--:--'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAttendanceData}
            disabled={loading}
            className="rounded-xl h-10 w-10 p-0 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Success Alert Toast ── */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="p-1 hover:text-emerald-300">
            ✕
          </button>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('punch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'punch'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Site Punching Terminal
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <History className="w-3.5 h-3.5" /> My Attendance History ({historyRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('regularisations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'regularisations'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Regularisation Requests ({regularisations.length})
        </button>
      </div>

      {/* ── TAB 1: Punch Terminal ── */}
      {activeTab === 'punch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Terminal Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border shadow-xs overflow-hidden">
              <CardHeader className="border-b border-border py-4 px-6 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Today&apos;s Geo-Punch Status
                    </CardTitle>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Status Summary Banner */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Deployment Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      {todayRecord?.punch_in_time && !todayRecord?.punch_out_time ? (
                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-base flex-wrap">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          Checked In &amp; Active On-Site
                          {todayRecord.date && todayRecord.date !== new Date().toISOString().split('T')[0] && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                              Overnight Shift (Started {todayRecord.date})
                            </span>
                          )}
                        </div>
                      ) : todayRecord?.punch_out_time ? (
                        <div className="flex items-center gap-2 text-primary font-bold text-base">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Shift Completed ({todayRecord.total_hours || 0} Hours Recorded)
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-500 font-bold text-base">
                          <Clock className="w-4 h-4" />
                          Not Checked In Yet
                        </div>
                      )}
                    </div>
                  </div>

                  {todayRecord && (
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(todayRecord.status, todayRecord.is_flagged)}
                      {todayRecord.punch_in_geo_status === 'within_radius' ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3 h-3" /> Geofence Verified
                        </Badge>
                      ) : todayRecord.punch_in_geo_status ? (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[11px]">
                          <ShieldAlert className="w-3 h-3" /> Outside Site Radius
                        </Badge>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Time & Duration Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Punch In Card */}
                  <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Punch In Time
                        </span>
                        {todayRecord?.punch_in_selfie && (
                          <button
                            onClick={() => setViewSelfieModal({ title: 'Punch In Selfie', src: todayRecord.punch_in_selfie })}
                            className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" /> Selfie
                          </button>
                        )}
                      </div>
                      <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {todayRecord?.punch_in_time ? (
                          new Date(todayRecord.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          '--:--'
                        )}
                      </span>
                    </div>

                    {todayRecord?.punch_in_time && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-emerald-500" /> In Location:
                          </span>
                          {todayRecord.punch_in_latitude != null && (
                            <button
                              onClick={() => setViewMapModal({
                                lat: todayRecord.punch_in_latitude,
                                lng: todayRecord.punch_in_longitude,
                                address: todayRecord.punch_in_address || todayRecord.project,
                                title: `Punch In Location — ${todayRecord.date}`
                              })}
                              className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              View Map
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground font-medium truncate" title={todayRecord.punch_in_address}>
                          {todayRecord.punch_in_address || (todayRecord.punch_in_latitude != null ? `${todayRecord.punch_in_latitude.toFixed(5)}, ${todayRecord.punch_in_longitude.toFixed(5)}` : 'GPS Verified')}
                        </p>
                        {todayRecord.punch_in_accuracy != null && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            Precision: ±{todayRecord.punch_in_accuracy}m
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Punch Out Card */}
                  <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Punch Out Time
                        </span>
                        {todayRecord?.punch_out_selfie && (
                          <button
                            onClick={() => setViewSelfieModal({ title: 'Punch Out Selfie', src: todayRecord.punch_out_selfie })}
                            className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" /> Selfie
                          </button>
                        )}
                      </div>
                      <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {todayRecord?.punch_out_time ? (
                          new Date(todayRecord.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          '--:--'
                        )}
                      </span>
                    </div>

                    {todayRecord?.punch_out_time && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-amber-500" /> Out Location:
                          </span>
                          {todayRecord.punch_out_latitude != null && (
                            <button
                              onClick={() => setViewMapModal({
                                lat: todayRecord.punch_out_latitude,
                                lng: todayRecord.punch_out_longitude,
                                address: todayRecord.punch_out_address || todayRecord.project,
                                title: `Punch Out Location — ${todayRecord.date}`
                              })}
                              className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              View Map
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground font-medium truncate" title={todayRecord.punch_out_address}>
                          {todayRecord.punch_out_address || (todayRecord.punch_out_latitude != null ? `${todayRecord.punch_out_latitude.toFixed(5)}, ${todayRecord.punch_out_longitude.toFixed(5)}` : 'GPS Verified')}
                        </p>
                        {todayRecord.punch_out_accuracy != null && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            Precision: ±{todayRecord.punch_out_accuracy}m
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shift Duration Card */}
                  <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Shift Duration
                      </span>
                      <span className="text-lg font-bold font-mono text-amber-500">
                        {todayRecord?.total_hours ? `${todayRecord.total_hours} hrs` : (
                          todayRecord?.punch_in_time ? 'In Progress' : '0.0 hrs'
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 pt-2.5 border-t border-border/60">
                      Standard shift: 8.0 hrs • Real-time duration
                    </p>
                  </div>
                </div>

                {/* Big Punch Buttons */}
                <div className="pt-2">
                  {!todayRecord?.punch_in_time ? (
                    <Button
                      onClick={() => handleOpenPunchModal('in')}
                      className="w-full py-6 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <Camera className="w-5 h-5" />
                      <span>START SHIFT — PUNCH IN WITH SELFIE & GPS</span>
                    </Button>
                  ) : !todayRecord?.punch_out_time ? (
                    <Button
                      onClick={() => handleOpenPunchModal('out')}
                      className="w-full py-6 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl shadow-lg shadow-amber-950/20 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>END SHIFT — PUNCH OUT WITH SELFIE & GPS</span>
                    </Button>
                  ) : (
                    <div className="text-center p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        You have already completed your primary shift for today.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPunchModal('out')}
                          className="text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-500" /> Update Punch Out
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRegModalOpen(true)}
                          className="text-xs"
                        >
                          Request Regularisation
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Site & Geofence Context Card */}
          <div className="space-y-6">
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="border-b border-border py-3.5 px-6">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  Assigned Project Site
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Punching For Project
                  </label>
                  <Select
                    value={selectedPunchProject || activeProject}
                    onChange={(e) => setSelectedPunchProject(e.target.value)}
                    className="w-full text-xs font-medium"
                  >
                    {projectList.length > 0 ? (
                      projectList.map(proj => (
                        <option key={proj} value={proj}>{proj}</option>
                      ))
                    ) : (
                      <option value={activeProject || 'General Project'}>
                        {activeProject || 'General Project'}
                      </option>
                    )}
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    If you are transferred or visiting another site, select it above before punching.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Security Verification Rules
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Selfie must be taken live using your camera (no gallery uploads).</li>
                    <li>Device GPS coordinates are verified against the project boundary.</li>
                    <li>Timestamp is securely recorded by PTS backend servers.</li>
                    <li>Punches outside the site boundary are flagged for manager audit.</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRegModalOpen(true)}
                    className="w-full text-xs font-medium"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    Missed a Punch? Request Regularisation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: Personal Attendance History ── */}
      {activeTab === 'history' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="border-b border-border py-3.5 px-6 flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Past 30 Days Attendance Register
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setRegModalOpen(true)} className="text-xs">
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" /> Request Correction
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {historyRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No historical attendance records logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Project / Site</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Punch Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Geo Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRecords.map(rec => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-semibold text-foreground text-xs whitespace-nowrap">
                          {rec.date}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">
                          {rec.project}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {rec.punch_in_time ? new Date(rec.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {rec.punch_out_time ? new Date(rec.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-amber-500 whitespace-nowrap">
                          {rec.total_hours ? `${rec.total_hours}h` : '—'}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {rec.punch_in_geo_status === 'within_radius' ? (
                            <span className="text-emerald-500 font-medium">Inside Site</span>
                          ) : rec.punch_in_geo_status ? (
                            <span className="text-rose-500 font-medium">Outside Site</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {rec.punch_in_selfie && (
                              <button
                                onClick={() => setViewSelfieModal({ title: `Punch In Selfie: ${rec.date} (${rec.project})`, src: rec.punch_in_selfie })}
                                title="View Punch In Selfie"
                                className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1 text-[11px]"
                              >
                                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">In</span>
                              </button>
                            )}
                            {rec.punch_out_selfie && (
                              <button
                                onClick={() => setViewSelfieModal({ title: `Punch Out Selfie: ${rec.date} (${rec.project})`, src: rec.punch_out_selfie })}
                                title="View Punch Out Selfie"
                                className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1 text-[11px]"
                              >
                                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Out</span>
                              </button>
                            )}
                            {rec.punch_in_latitude != null && (
                              <button
                                onClick={() => setViewMapModal({
                                  lat: rec.punch_in_latitude,
                                  lng: rec.punch_in_longitude,
                                  address: rec.punch_in_address || rec.project,
                                  title: `Punch In Location: ${rec.date} (${rec.project})`
                                })}
                                title="View Punch In Location Map"
                                className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1 text-[11px]"
                              >
                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">In Map</span>
                              </button>
                            )}
                            {rec.punch_out_latitude != null && (
                              <button
                                onClick={() => setViewMapModal({
                                  lat: rec.punch_out_latitude,
                                  lng: rec.punch_out_longitude,
                                  address: rec.punch_out_address || rec.project,
                                  title: `Punch Out Location: ${rec.date} (${rec.project})`
                                })}
                                title="View Punch Out Location Map"
                                className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-1 text-[11px]"
                              >
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Out Map</span>
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {renderStatusBadge(rec.status, rec.is_flagged)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 3: Regularisation Requests ── */}
      {activeTab === 'regularisations' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="border-b border-border py-3.5 px-6 flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              My Attendance Regularisation Requests
            </CardTitle>
            <Button size="sm" onClick={() => setRegModalOpen(true)} className="text-xs">
              + New Correction Request
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {regularisations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No regularisation requests submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Proposed In</TableHead>
                      <TableHead>Proposed Out</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Manager Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regularisations.map(reg => (
                      <TableRow key={reg.id}>
                        <TableCell className="text-xs font-semibold text-foreground whitespace-nowrap">
                          {reg.date}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">
                          {reg.project}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {reg.proposed_punch_in ? new Date(reg.proposed_punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {reg.proposed_punch_out ? new Date(reg.proposed_punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {reg.reason}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {reg.status === 'approved' ? (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                              Approved
                            </Badge>
                          ) : reg.status === 'rejected' ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                              Pending Review
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {reg.reviewer_notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Modal: Live Camera + GPS Attendance Punch ── */}
      <Dialog
        open={punchModalOpen}
        onClose={handleClosePunchModal}
        title={`Live Site Punch ${punchType === 'in' ? 'In (Start Shift)' : 'Out (End Shift)'}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Target Project Display */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Target Project:</span>
            <span className="font-bold text-foreground">{selectedPunchProject || activeProject}</span>
          </div>

          {/* Camera Capture Area */}
          <div className="relative aspect-4/3 bg-black rounded-2xl overflow-hidden border border-border flex items-center justify-center">
            {selfiePreview ? (
              <img src={selfiePreview} alt="Captured Selfie" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}

            {/* Selfie Overlay Framing Guide */}
            {!selfiePreview && cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-56 border-2 border-dashed border-amber-500/60 rounded-full" />
              </div>
            )}

            {/* Camera error banner */}
            {cameraError && (
              <div className="absolute inset-x-4 bottom-4 p-3 bg-red-950/90 border border-red-500/50 rounded-xl text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-red-400" />
                {cameraError}
              </div>
            )}
          </div>

          {/* Camera Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            {selfiePreview ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelfiePreview(null);
                  startCamera();
                }}
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-500" /> Retake Selfie
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={captureSelfie}
                disabled={!cameraActive}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-6"
              >
                <Camera className="w-4 h-4 mr-1.5" /> Capture Selfie Snapshot
              </Button>
            )}
          </div>

          {/* GPS Telemetry Bar */}
          <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                GPS Coordinates & Precision
              </span>
              <div className="flex items-center gap-2">
                {gpsLoading ? (
                  <span className="text-amber-500 text-[11px] font-mono animate-pulse">Locking Satellites...</span>
                ) : gpsCoords ? (
                  <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                    gpsCoords.accuracy <= 25
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
                      : gpsCoords.accuracy <= 80
                      ? 'text-blue-500 bg-blue-500/10 border-blue-500/30'
                      : 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                  }`}>
                    ±{gpsCoords.accuracy}m {gpsCoords.accuracy <= 25 ? 'High Precision' : 'Locked'}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={fetchGpsLocation}
                  disabled={gpsLoading}
                  className="text-xs text-amber-500 hover:underline flex items-center gap-1 cursor-pointer font-semibold ml-1"
                >
                  <RotateCcw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} /> Refresh GPS
                </button>
              </div>
            </div>

            {gpsCoords && (
              <div className="text-[11px] font-mono text-muted-foreground">
                Lat: <span className="text-foreground font-semibold">{gpsCoords.latitude.toFixed(6)}</span>, Lng: <span className="text-foreground font-semibold">{gpsCoords.longitude.toFixed(6)}</span>
              </div>
            )}
            {gpsAddress && (
              <div className="text-[11px] text-foreground font-medium leading-relaxed bg-card p-2 rounded-lg border border-border/60">
                {gpsAddress}
              </div>
            )}
            {gpsError && (
              <div className="text-[11px] text-rose-500 font-medium">
                {gpsError}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={handleClosePunchModal} disabled={punchSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitPunch}
              disabled={punchSubmitting || !selfiePreview || !gpsCoords}
              className={`font-bold text-xs ${
                punchType === 'in' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {punchSubmitting ? 'Recording Punch...' : `Confirm Punch ${punchType === 'in' ? 'In' : 'Out'}`}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Modal: Regularisation Request ── */}
      <Dialog
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        title="Request Attendance Regularisation / Correction"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitRegularisation} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Missed a punch due to poor mobile network, site emergency, or battery failure? Submit a correction request with proposed times for your manager to review.
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target Date</label>
            <Input
              type="date"
              value={regFormData.date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setRegFormData({ ...regFormData, date: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Project Site</label>
            <Select
              value={regFormData.project || activeProject}
              onChange={(e) => setRegFormData({ ...regFormData, project: e.target.value })}
              className="w-full text-xs"
            >
              {projectList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Proposed In Time</label>
              <Input
                type="time"
                value={regFormData.proposed_punch_in}
                onChange={(e) => setRegFormData({ ...regFormData, proposed_punch_in: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Proposed Out Time</label>
              <Input
                type="time"
                value={regFormData.proposed_punch_out}
                onChange={(e) => setRegFormData({ ...regFormData, proposed_punch_out: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason for Regularisation</label>
            <Textarea
              rows={3}
              value={regFormData.reason}
              onChange={(e) => setRegFormData({ ...regFormData, reason: e.target.value })}
              placeholder="e.g. Phone battery drained on site; was present with site supervisor from 9:30 AM to 6:30 PM."
              required
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setRegModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={submittingReg} className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950">
              {submittingReg ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal: Selfie Preview ── */}
      <Dialog
        open={!!viewSelfieModal}
        onClose={() => setViewSelfieModal(null)}
        title={viewSelfieModal?.title || 'Attendance Selfie Photograph'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="aspect-4/3 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-border">
            {viewSelfieModal?.src && (
              <img src={viewSelfieModal.src} alt="Selfie" className="w-full h-full object-contain" />
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewSelfieModal(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Modal: GPS Location Map ── */}
      <Dialog
        open={!!viewMapModal}
        onClose={() => setViewMapModal(null)}
        title={viewMapModal?.title || 'GPS Verification Map'}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {viewMapModal && (() => {
            const numLat = Number(viewMapModal.lat) || 0;
            const numLng = Number(viewMapModal.lng) || 0;
            const minLng = (numLng - 0.005).toFixed(6);
            const minLat = (numLat - 0.005).toFixed(6);
            const maxLng = (numLng + 0.005).toFixed(6);
            const maxLat = (numLat + 0.005).toFixed(6);
            return (
              <>
                <div className="h-72 rounded-2xl overflow-hidden border border-border bg-muted">
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${numLat.toFixed(6)},${numLng.toFixed(6)}`}
                  />
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground">{viewMapModal.address}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">
                    Coordinates: {numLat.toFixed(6)}, {numLng.toFixed(6)}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                  </a>
                  <Button variant="outline" size="sm" onClick={() => setViewMapModal(null)}>
                    Close
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      </Dialog>
    </div>
  );
}
