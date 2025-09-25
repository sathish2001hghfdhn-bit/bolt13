import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Video, Star, MapPin, Award, 
  CheckCircle, ArrowLeft, ArrowRight, Search, Filter,
  User, Phone, Mail, Heart, Shield, X, ChevronLeft,
  ChevronRight, CreditCard, Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { trackPayment } from '../utils/analyticsManager';

interface Therapist {
  id: string;
  name: string;
  title: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  avatar: string;
  verified: boolean;
  nextAvailable: string;
  bio: string;
  languages: string[];
  availability?: string[];
}

interface BookingStep {
  step: number;
  title: string;
  description: string;
}

function BookingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [sessionType, setSessionType] = useState<'video' | 'phone'>('video');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState<string>('all');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  const steps: BookingStep[] = [
    { step: 1, title: 'Choose Therapist', description: 'Select from our verified professionals' },
    { step: 2, title: 'Select Date & Time', description: 'Pick your preferred appointment slot' },
    { step: 3, title: 'Session Details', description: 'Confirm your booking details' },
    { step: 4, title: 'Payment', description: 'Secure payment processing' }
  ];

  useEffect(() => {
    // Load therapists from localStorage
    const savedTherapists = localStorage.getItem('mindcare_therapists');
    if (savedTherapists) {
      setTherapists(JSON.parse(savedTherapists));
    } else {
      // Default therapists if none saved
      const defaultTherapists: Therapist[] = [
        {
          id: '1',
          name: 'Dr. Sarah Smith',
          title: 'Ph.D. in Clinical Psychology',
          specialization: ['Anxiety', 'Depression', 'CBT'],
          experience: 8,
          rating: 4.9,
          reviewCount: 127,
          hourlyRate: 120,
          location: 'Online',
          avatar: 'https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=150',
          verified: true,
          nextAvailable: 'Today, 2:00 PM',
          bio: 'Experienced therapist specializing in CBT with a passion for helping patients overcome anxiety and depression.',
          languages: ['English', 'Spanish'],
          availability: [
            'Monday 9:00 AM', 'Monday 10:00 AM', 'Monday 11:00 AM', 'Monday 12:00 PM', 
            'Monday 1:00 PM', 'Monday 2:00 PM', 'Monday 3:00 PM', 'Monday 4:00 PM', 'Monday 5:00 PM',
            'Tuesday 9:00 AM', 'Tuesday 10:00 AM', 'Tuesday 11:00 AM', 'Tuesday 12:00 PM',
            'Tuesday 1:00 PM', 'Tuesday 2:00 PM', 'Tuesday 3:00 PM', 'Tuesday 4:00 PM', 'Tuesday 5:00 PM',
            'Wednesday 9:00 AM', 'Wednesday 10:00 AM', 'Wednesday 11:00 AM', 'Wednesday 12:00 PM',
            'Wednesday 1:00 PM', 'Wednesday 2:00 PM', 'Wednesday 3:00 PM', 'Wednesday 4:00 PM', 'Wednesday 5:00 PM',
            'Thursday 9:00 AM', 'Thursday 10:00 AM', 'Thursday 11:00 AM', 'Thursday 12:00 PM',
            'Thursday 1:00 PM', 'Thursday 2:00 PM', 'Thursday 3:00 PM', 'Thursday 4:00 PM', 'Thursday 5:00 PM',
            'Friday 9:00 AM', 'Friday 10:00 AM', 'Friday 11:00 AM', 'Friday 12:00 PM',
            'Friday 1:00 PM', 'Friday 2:00 PM', 'Friday 3:00 PM', 'Friday 4:00 PM', 'Friday 5:00 PM'
          ]
        },
        {
          id: '2',
          name: 'Dr. Emily Rodriguez',
          title: 'Licensed Family Therapist',
          specialization: ['Family Therapy', 'Couples Counseling', 'EMDR'],
          experience: 10,
          rating: 4.7,
          reviewCount: 89,
          hourlyRate: 140,
          location: 'Online',
          avatar: 'https://images.pexels.com/photos/5327647/pexels-photo-5327647.jpeg?auto=compress&cs=tinysrgb&w=150',
          verified: true,
          nextAvailable: 'Tomorrow, 10:00 AM',
          bio: 'Specializing in family dynamics and trauma recovery with over 10 years of experience.',
          languages: ['English', 'Spanish', 'Portuguese']
        }
      ];
      setTherapists(defaultTherapists);
      localStorage.setItem('mindcare_therapists', JSON.stringify(defaultTherapists));
    }
  }, []);

  const getAvailableTimeSlots = () => {
    if (!selectedTherapist || !selectedDate) return [];

    const selectedDateObj = new Date(selectedDate);
    const today = new Date();
    const isToday = selectedDate === today.toISOString().split('T')[0];
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Get day name for the selected date
    const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get therapist's availability for this day
    const dayAvailability = selectedTherapist.availability?.filter(slot => 
      slot.startsWith(dayName)
    ) || [];

    // Extract time slots and filter based on current time if it's today
    const timeSlots = dayAvailability.map(slot => {
      const timePart = slot.split(' ').slice(1).join(' '); // Get time part after day name
      return timePart;
    });

    // If it's today, filter out past time slots
    if (isToday) {
      return timeSlots.filter(timeSlot => {
        const [time, period] = timeSlot.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        // Convert to 24-hour format
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hours === 12) {
          hour24 = 0;
        }
        
        const slotTimeInMinutes = hour24 * 60 + minutes;
        
        // Only show slots that are at least 1 hour in the future
        return slotTimeInMinutes > currentTimeInMinutes + 60;
      });
    }

    return timeSlots;
  };

  const isTimeSlotDisabled = (timeSlot: string) => {
    const today = new Date();
    const isToday = selectedDate === today.toISOString().split('T')[0];
    
    if (!isToday) return false;

    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    const slotTimeInMinutes = hour24 * 60 + minutes;
    
    // Disable if the slot is in the past or within the next hour
    return slotTimeInMinutes <= currentTimeInMinutes + 60;
  };

  const handleBooking = async () => {
    if (!selectedTherapist || !selectedDate || !selectedTime) {
      toast.error('Please complete all booking details');
      return;
    }

    const bookingData = {
      id: Date.now().toString(),
      patientId: user?.id,
      patientName: user?.name,
      patientEmail: user?.email,
      therapistId: selectedTherapist.id,
      therapistName: selectedTherapist.name,
      date: selectedDate,
      time: selectedTime,
      sessionType,
      amount: `$${selectedTherapist.hourlyRate}`,
      status: 'pending_confirmation',
      createdAt: new Date().toISOString(),
      notes: `${sessionType} session with ${selectedTherapist.name}`
    };

    // Save booking
    const existingBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
    const updatedBookings = [...existingBookings, bookingData];
    localStorage.setItem('mindcare_bookings', JSON.stringify(updatedBookings));

    // Track payment
    trackPayment(bookingData);

    toast.success('Booking confirmed! You will receive a confirmation email shortly.');
    
    // Reset form
    setCurrentStep(1);
    setSelectedTherapist(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime('');
    setShowPayment(false);
  };

  const filteredTherapists = therapists.filter(therapist => {
    const matchesSearch = therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         therapist.specialization.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialization = filterSpecialization === 'all' || 
                                 therapist.specialization.includes(filterSpecialization);
    return matchesSearch && matchesSpecialization;
  });

  const availableTimeSlots = getAvailableTimeSlots();

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50'
    }`}>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Book Session
          </h1>
          <p className={`text-base ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Schedule a video therapy session with our licensed professionals
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`mb-6 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div className={`flex items-center space-x-3 ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    currentStep >= step.step
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.step ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step.step
                    )}
                  </div>
                  <div className="hidden md:block">
                    <h4 className={`text-sm font-medium ${
                      currentStep >= step.step
                        ? theme === 'dark' ? 'text-white' : 'text-gray-800'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </h4>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden md:block w-16 h-0.5 mx-4 ${
                    currentStep > step.step
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                      : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="space-y-4"
            >
              {/* Search and Filter */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <input
                      type="text"
                      placeholder="Search therapists..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>
                  <select
                    value={filterSpecialization}
                    onChange={(e) => setFilterSpecialization(e.target.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="all">All Specializations</option>
                    <option value="Anxiety">Anxiety</option>
                    <option value="Depression">Depression</option>
                    <option value="CBT">CBT</option>
                    <option value="Family Therapy">Family Therapy</option>
                    <option value="EMDR">EMDR</option>
                  </select>
                </div>
              </div>

              {/* Therapists Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTherapists.map((therapist, index) => (
                  <motion.div
                    key={therapist.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    onClick={() => {
                      setSelectedTherapist(therapist);
                      setCurrentStep(2);
                    }}
                    className={`p-4 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ${
                      theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="relative">
                        <img
                          src={therapist.avatar}
                          alt={therapist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {therapist.verified && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {therapist.name}
                        </h3>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {therapist.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {therapist.rating}
                        </span>
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ({therapist.reviewCount})
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award className="w-4 h-4 text-purple-500" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {therapist.experience} years
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {therapist.specialization.slice(0, 3).map((spec, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {therapist.location}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold text-green-600`}>
                          ${therapist.hourlyRate}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          per session
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Next available: {therapist.nextAvailable}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && selectedTherapist && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className={`p-6 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={selectedTherapist.avatar}
                  alt={selectedTherapist.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h2 className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {selectedTherapist.name}
                  </h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedTherapist.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedTherapist.rating} ({selectedTherapist.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Date Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime(''); // Reset time when date changes
                    }}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Session Type */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Session Type
                  </label>
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSessionType('video')}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 ${
                        sessionType === 'video'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      <Video className={`w-5 h-5 mx-auto mb-2 ${
                        sessionType === 'video' ? 'text-purple-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`} />
                      <span className={`text-sm font-medium ${
                        sessionType === 'video' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Video Call
                      </span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSessionType('phone')}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 ${
                        sessionType === 'phone'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      <Phone className={`w-5 h-5 mx-auto mb-2 ${
                        sessionType === 'phone' ? 'text-purple-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`} />
                      <span className={`text-sm font-medium ${
                        sessionType === 'phone' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Phone Call
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Available Time Slots */}
              <div className="mt-6">
                <label className={`block text-sm font-medium mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Available Time Slots
                  {selectedDate === new Date().toISOString().split('T')[0] && (
                    <span className={`ml-2 text-xs ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      (Only future slots shown for today)
                    </span>
                  )}
                </label>
                
                {availableTimeSlots.length === 0 ? (
                  <div className={`p-6 rounded-lg text-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <Clock className={`w-8 h-8 mx-auto mb-2 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedDate === new Date().toISOString().split('T')[0] 
                        ? 'No more slots available today. Please select a future date.'
                        : 'No available slots for this date. Please select another date.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {availableTimeSlots.map((timeSlot) => {
                      const isDisabled = isTimeSlotDisabled(timeSlot);
                      return (
                        <motion.button
                          key={timeSlot}
                          whileHover={!isDisabled ? { scale: 1.05 } : {}}
                          whileTap={!isDisabled ? { scale: 0.95 } : {}}
                          onClick={() => !isDisabled && setSelectedTime(timeSlot)}
                          disabled={isDisabled}
                          className={`p-3 rounded-lg font-medium transition-all duration-200 ${
                            selectedTime === timeSlot
                              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                              : isDisabled
                              ? theme === 'dark'
                                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                              : theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {timeSlot}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStep(1)}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectedTime && setCurrentStep(3)}
                  disabled={!selectedTime}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && selectedTherapist && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className={`p-6 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <h3 className={`text-xl font-semibold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Confirm Your Booking
              </h3>

              <div className="space-y-4 mb-6">
                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    Therapist
                  </h4>
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedTherapist.avatar}
                      alt={selectedTherapist.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {selectedTherapist.name}
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {selectedTherapist.title}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    Session Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Date:</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {new Date(selectedDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Time:</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Type:</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {sessionType === 'video' ? 'Video Call' : 'Phone Call'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Duration:</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        50 minutes
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Total:</span>
                      <span className="text-green-600 text-lg">
                        ${selectedTherapist.hourlyRate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStep(2)}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 font-medium"
                >
                  Proceed to Payment
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && selectedTherapist && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className={`p-6 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <h3 className={`text-xl font-semibold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Payment Information
              </h3>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Payment Method
                </label>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                      paymentMethod === 'card'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                      paymentMethod === 'card' ? 'text-purple-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      paymentMethod === 'card' 
                        ? 'text-purple-600 dark:text-purple-400' 
                        : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Credit/Debit Card
                    </span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                      paymentMethod === 'paypal'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-6 h-6 mx-auto mb-2 rounded ${
                      paymentMethod === 'paypal' ? 'bg-purple-500' : theme === 'dark' ? 'bg-gray-400' : 'bg-gray-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      paymentMethod === 'paypal' 
                        ? 'text-purple-600 dark:text-purple-400' 
                        : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      PayPal
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* Payment Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className={`p-3 rounded-lg mb-6 ${
                theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-700'
                  }`}>
                    Your payment information is encrypted and secure
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStep(3)}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBooking}
                  className="px-8 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 font-medium flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default BookingPage;