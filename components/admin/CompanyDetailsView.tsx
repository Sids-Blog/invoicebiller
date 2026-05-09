'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Phone, MapPin, Hash } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  company_name?: string;
  company_email?: string;
  contact_number?: string;
  gst_number?: string;
  address?: string;
  created_at: string;
}

interface CompanyDetailsViewProps {
  company: Company;
  onSave: (updatedCompany: Partial<Company>) => Promise<void>;
  onCancel: () => void;
}

export function CompanyDetailsView({ company, onSave, onCancel }: CompanyDetailsViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: company.company_name || company.name,
    company_email: company.company_email || '',
    contact_number: company.contact_number || '',
    gst_number: company.gst_number || '',
    address: company.address || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save company details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      company_name: company.company_name || company.name,
      company_email: company.company_email || '',
      contact_number: company.contact_number || '',
      gst_number: company.gst_number || '',
      address: company.address || '',
    });
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Company Details</CardTitle>
        </div>
        {!isEditing && (
          <Button onClick={handleEdit} variant="outline" size="sm">
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              disabled={!isEditing}
              className="pl-10"
              placeholder="Enter company name"
            />
          </div>
        </div>

        {/* Email and Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_email">Business Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                disabled={!isEditing}
                className="pl-10"
                placeholder="business@company.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                disabled={!isEditing}
                className="pl-10"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>

        {/* GST Number */}
        <div className="space-y-2">
          <Label htmlFor="gst_number">GST Number</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="gst_number"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              disabled={!isEditing}
              className="pl-10"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!isEditing}
              className="pl-10"
              placeholder="123 Business Street, City, State 123456"
            />
          </div>
        </div>

        {/* Created Date */}
        <div className="space-y-2">
          <Label>Member Since</Label>
          <Input
            value={formatDate(company.created_at)}
            disabled
            className="bg-muted/50"
          />
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}