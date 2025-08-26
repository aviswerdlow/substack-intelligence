'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save, Clock, Mail, Calendar } from 'lucide-react';

interface ReportSchedule {
  id: string;
  report_type: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  delivery_time: string;
  recipients: string[];
  last_run?: string;
  next_run?: string;
}

interface ScheduleConfigModalProps {
  schedule: ReportSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ReportSchedule) => Promise<void>;
}

export function ScheduleConfigModal({ 
  schedule, 
  isOpen, 
  onClose, 
  onSave 
}: ScheduleConfigModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState('1'); // Monday
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setDeliveryTime(schedule.delivery_time || '09:00');
      setRecipients(schedule.recipients || []);
      
      // Parse delivery configuration based on type
      if (schedule.report_type === 'weekly') {
        // Extract day of week from delivery_time if stored as "1,09:00"
        const parts = schedule.delivery_time?.split(',') || [];
        if (parts.length > 1) {
          setDayOfWeek(parts[0]);
          setDeliveryTime(parts[1]);
        }
      } else if (schedule.report_type === 'monthly') {
        // Extract day of month from delivery_time if stored as "15,09:00"
        const parts = schedule.delivery_time?.split(',') || [];
        if (parts.length > 1) {
          setDayOfMonth(parts[0]);
          setDeliveryTime(parts[1]);
        }
      }
    }
  }, [schedule]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddRecipient = () => {
    const trimmedEmail = newRecipient.trim();
    
    if (!trimmedEmail) {
      setErrors({ ...errors, newRecipient: 'Email is required' });
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setErrors({ ...errors, newRecipient: 'Invalid email format' });
      return;
    }
    
    if (recipients.includes(trimmedEmail)) {
      setErrors({ ...errors, newRecipient: 'Email already added' });
      return;
    }
    
    setRecipients([...recipients, trimmedEmail]);
    setNewRecipient('');
    setErrors({ ...errors, newRecipient: '' });
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSave = async () => {
    if (!schedule) return;
    
    // Validation
    const newErrors: { [key: string]: string } = {};
    
    if (enabled && recipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required when enabled';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Construct delivery_time based on report type
      let finalDeliveryTime = deliveryTime;
      
      if (schedule.report_type === 'weekly') {
        finalDeliveryTime = `${dayOfWeek},${deliveryTime}`;
      } else if (schedule.report_type === 'monthly') {
        finalDeliveryTime = `${dayOfMonth},${deliveryTime}`;
      }
      
      const updatedSchedule: ReportSchedule = {
        ...schedule,
        enabled,
        delivery_time: finalDeliveryTime,
        recipients,
      };
      
      await onSave(updatedSchedule);
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setErrors({ save: 'Failed to save configuration. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!schedule) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configure {schedule.report_type.charAt(0).toUpperCase() + schedule.report_type.slice(1)} Report
          </DialogTitle>
          <DialogDescription>
            Set up when and how this report should be delivered
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enabled">Enable Schedule</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate and send reports
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          
          {/* Delivery Time Configuration */}
          <div className="space-y-4">
            <Label>Delivery Schedule</Label>
            
            {schedule.report_type === 'daily' && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Every day at</span>
                <Input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-32"
                  disabled={!enabled}
                />
              </div>
            )}
            
            {schedule.report_type === 'weekly' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Every</span>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek} disabled={!enabled}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">at</span>
                  <Input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-32"
                    disabled={!enabled}
                  />
                </div>
              </div>
            )}
            
            {schedule.report_type === 'monthly' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Day</span>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth} disabled={!enabled}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                      <SelectItem value="last">Last day</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">of each month</span>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">at</span>
                  <Input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-32"
                    disabled={!enabled}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Recipients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Recipients</Label>
              <span className="text-sm text-muted-foreground">
                <Mail className="h-3 w-3 inline mr-1" />
                {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {errors.recipients && (
              <p className="text-sm text-destructive">{errors.recipients}</p>
            )}
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newRecipient}
                  onChange={(e) => {
                    setNewRecipient(e.target.value);
                    setErrors({ ...errors, newRecipient: '' });
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                  disabled={!enabled}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRecipient}
                  disabled={!enabled}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {errors.newRecipient && (
                <p className="text-sm text-destructive">{errors.newRecipient}</p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="pr-1">
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient(email)}
                      className="ml-2 hover:text-destructive"
                      disabled={!enabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {errors.save && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {errors.save}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}