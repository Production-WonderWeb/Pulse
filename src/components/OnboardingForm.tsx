import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types/index';
import { motion } from 'motion/react';
import { Phone, MapPin, User as UserIcon, MessageSquare, AlertCircle } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface OnboardingFormProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ user, onComplete }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    whatsapp: '',
    address: '',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    whatsappIsDifferent: false,
    imageUrl: user.imageUrl || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedFields = {
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsappIsDifferent ? formData.whatsapp : formData.phone,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactRelation: formData.emergencyContactRelation,
        imageUrl: formData.imageUrl,
        avatar_url: formData.imageUrl,
        isOnboarded: true
      };

      await updateDoc(doc(db, 'profiles', user.id), updatedFields);
      
      onComplete({
        ...user,
        ...updatedFields
      });
    } catch (error) {
      console.error("Error updating profile during onboarding:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-[var(--bg-secondary)] rounded-[2.5rem] p-8 md:p-12 border border-[var(--border-color)] shadow-2xl relative overflow-hidden"
      >
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl -ml-32 -mb-32" />

        <div className="relative z-10">
          <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <UserIcon size={32} className="text-brand-blue" />
            </div>
            <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Initialize Profile</h2>
            <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest leading-relaxed">
              Complete your operational credentials to gain system access.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <ImageUpload
                label="Profile Picture"
                value={formData.imageUrl}
                onChange={(val) => setFormData({...formData, imageUrl: val})}
                aspectRatio="square"
                className="w-32 h-32"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name & Email (Pre-filled) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/40" size={16} />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5 opacity-60 cursor-not-allowed">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Email (System)</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">@</div>
                   <input
                    disabled
                    type="email"
                    value={formData.email}
                    className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border-color)]/50 rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-secondary)] focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/40" size={16} />
                  <input
                    required
                    type="tel"
                    placeholder="+971 50 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">WhatsApp Number</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.whatsappIsDifferent}
                      onChange={(e) => setFormData({...formData, whatsappIsDifferent: e.target.checked})}
                      className="w-3 h-3 rounded border-[var(--border-color)] text-brand-blue focus:ring-0"
                    />
                    <span className="text-[8px] font-black uppercase text-brand-blue">Different</span>
                  </label>
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green/40" size={16} />
                  <input
                    required={formData.whatsappIsDifferent}
                    disabled={!formData.whatsappIsDifferent}
                    type="tel"
                    placeholder={formData.whatsappIsDifferent ? "+971 50 999 8888" : "Same as phone"}
                    value={formData.whatsappIsDifferent ? formData.whatsapp : formData.phone}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue font-mono disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Residential Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-brand-blue/40" size={16} />
                <textarea
                  required
                  rows={2}
                  placeholder="Street name, Villa/Apartment number, District, City"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue font-medium resize-none"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 pt-2">
              <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest ml-1 flex items-center gap-2">
                <AlertCircle size={10} />
                Emergency Contact (Next of Kin)
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Contact Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange/40" size={16} />
                    <input
                      required
                      type="text"
                      placeholder="Jane Doe"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-brand-orange/10 rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-orange font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Relationship</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange/40" size={16} />
                    <input
                      required
                      type="text"
                      placeholder="Spouse, Parent, Sibling"
                      value={formData.emergencyContactRelation}
                      onChange={(e) => setFormData({...formData, emergencyContactRelation: e.target.value})}
                      className="w-full bg-[var(--bg-primary)] border border-brand-orange/10 rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-orange font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Contact Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange/40" size={16} />
                  <input
                    required
                    type="tel"
                    placeholder="+971 -- --- ----"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    className="w-full bg-[var(--bg-primary)] border border-brand-orange/10 rounded-xl pl-12 pr-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-orange font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Initializing...' : 'Authorize Full Access'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
