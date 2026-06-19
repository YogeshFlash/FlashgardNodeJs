import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'ta' | 'hi';

const translations = {
  en: {
    systemSettings: 'System Settings',
    settingsDesc: 'Configure system parameters, role controls, organizations, and user directories.',
    controlCategories: 'Control Categories',
    generalSettings: 'General Settings',
    usersDirectory: 'Users Directory',
    accessRoles: 'Access Roles',
    rolePermissions: 'Role Permissions',
    plottersDirectory: 'Plotters Directory',
    orgTypes: 'Organization Types',
    materialsSettings: 'Materials Settings',
    systemAuditLogs: 'System Audit Logs',
    notifications: 'Notifications',
    notifDesc: 'Configure how you receive system alerts',
    emailNotif: 'Email Notifications',
    emailNotifDesc: 'Receive summaries and alerts via email',
    loginAlerts: 'Login Alerts',
    loginAlertsDesc: 'Get notified when a new login is detected',
    securitySettings: 'Security Settings',
    securityDesc: 'Secure your profile credentials',
    twoFA: 'Two-Factor Authentication',
    twoFADesc: 'Require a second factor at login',
    sessionTimeout: 'Session Timeout',
    sessionTimeoutDesc: 'Automatically sign out after inactivity',
    localization: 'Localization',
    localDesc: 'Select language & timezone preference',
    defaultLanguage: 'Default Language',
    timezone: 'Timezone',
    systemDetails: 'System Details',
    systemDetailsDesc: 'General platform versions and metadata',
    application: 'Application',
    version: 'Version',
    save: 'Save',
    cancel: 'Cancel',
    dashboard: 'Dashboard',
    organizations: 'Organizations',
    reports: 'Reports',
    models: 'Models',
    inventory: 'Inventory',
    licenses: 'Licenses',
    migration: 'Data Migration',
    settings: 'Settings',
    searchPlaceholder: 'Search organizations, users...',
    myProfile: 'My Profile',
    signOut: 'Sign Out',
    platformAdmin: 'Platform Admin',
    administrator: 'Administrator',
  },
  ta: {
    systemSettings: 'அமைப்பு அமைப்புகள்',
    settingsDesc: 'கணினி அளவுருக்கள், பாத்திரக் கட்டுப்பாடுகள், நிறுவனங்கள் மற்றும் பயனர் அடைவுகளை உள்ளமைக்கவும்.',
    controlCategories: 'கட்டுப்பாட்டு பிரிவுகள்',
    generalSettings: 'பொதுவான அமைப்புகள்',
    usersDirectory: 'பயனர்கள் அடைவு',
    accessRoles: 'அணுகல் பாத்திரங்கள்',
    rolePermissions: 'பாத்திர அனுமதிகள்',
    plottersDirectory: 'வரைவிகள் அடைவு',
    orgTypes: 'நிறுவன வகைகள்',
    materialsSettings: 'பொருட்கள் அமைப்புகள்',
    systemAuditLogs: 'கணினி தணிக்கை பதிவுகள்',
    notifications: 'அறிவிப்புகள்',
    notifDesc: 'கணினி எச்சரிக்கைகளைப் பெறுவதை உள்ளமைக்கவும்',
    emailNotif: 'மின்னஞ்சல் அறிவிப்புகள்',
    emailNotifDesc: 'மின்னஞ்சல் மூலம் சுருக்கங்கள் மற்றும் எச்சரிக்கைகளைப் பெறுக',
    loginAlerts: 'உள்நுழைவு எச்சரிக்கைகள்',
    loginAlertsDesc: 'புதிய உள்நுழைவு கண்டறியப்படும்போது அறிவிப்பைப் பெறுக',
    securitySettings: 'பாதுகாப்பு அமைப்புகள்',
    securityDesc: 'உங்கள் சுயவிவரச் சான்றுகளைப் பாதுகாக்கவும்',
    twoFA: 'இரண்டு காரணி அங்கீகாரம்',
    twoFADesc: 'உள்நுழையும்போது இரண்டாவது காரணியை கட்டாயமாக்குங்கள்',
    sessionTimeout: 'அமர்வு காலாவதி',
    sessionTimeoutDesc: 'செயலற்ற நிலைக்குப் பிறகு தானாகவே வெளியேறவும்',
    localization: 'உள்ளூர்மயமாக்கல்',
    localDesc: 'மொழி மற்றும் நேர மண்டல விருப்பத்தைத் தேர்ந்தெடுக்கவும்',
    defaultLanguage: 'இயல்புநிலை மொழி',
    timezone: 'நேர மண்டலம்',
    systemDetails: 'கணினி விவரங்கள்',
    systemDetailsDesc: 'பொதுவான இயங்குதள பதிப்புகள் மற்றும் மெட்டாடேட்டா',
    application: 'பயன்பாடு',
    version: 'பதிப்பு',
    save: 'சேமி',
    cancel: 'ரத்துசெய்',
    dashboard: 'டாஷ்போர்டு',
    organizations: 'நிறுவனங்கள்',
    reports: 'அறிக்கைகள்',
    models: 'மாதிரிகள்',
    inventory: 'சரக்கு',
    licenses: 'உரிமங்கள்',
    migration: 'தரவு இடம்பெயர்வு',
    settings: 'அமைப்புகள்',
    searchPlaceholder: 'தேடுங்கள்...',
    myProfile: 'எனது சுயவிவரம்',
    signOut: 'வெளியேறு',
    platformAdmin: 'தள நிர்வாகி',
    administrator: 'நிர்வாகி',
  },
  hi: {
    systemSettings: 'सिस्टम सेटिंग्स',
    settingsDesc: 'सिस्टम मापदंडों, भूमिका नियंत्रणों, संगठनों और उपयोगकर्ता निर्देशिकाओं को कॉन्फ़िगर करें।',
    controlCategories: 'नियंत्रण श्रेणियां',
    generalSettings: 'सामान्य सेटिंग्स',
    usersDirectory: 'उपयोगकर्ता निर्देशिका',
    accessRoles: 'एक्सेस भूमिकाएं',
    rolePermissions: 'भूमिका अनुमतियाँ',
    plottersDirectory: 'प्लॉटर निर्देशिका',
    orgTypes: 'संगठन प्रकार',
    materialsSettings: 'सामग्री सेटिंग्स',
    systemAuditLogs: 'सिस्टम ऑडिट लॉग',
    notifications: 'सूचनाएं',
    notifDesc: 'कॉन्फ़िगर करें कि आप सिस्टम अलर्ट कैसे प्राप्त करते हैं',
    emailNotif: 'ईमेल सूचनाएं',
    emailNotifDesc: 'ईमेल के माध्यम से सारांश और अलर्ट प्राप्त करें',
    loginAlerts: 'लॉगिन अलर्ट',
    loginAlertsDesc: 'नया लॉगिन होने पर सूचित करें',
    securitySettings: 'सुरक्षा सेटिंग्स',
    securityDesc: 'अपने प्रोफाइल क्रेडेंशियल सुरक्षित करें',
    twoFA: 'द्वि-कारक प्रमाणीकरण',
    twoFADesc: 'लॉगिन पर दूसरे कारक की आवश्यकता है',
    sessionTimeout: 'सत्र समय समाप्त',
    sessionTimeoutDesc: 'निष्क्रियता के बाद स्वचालित रूप से साइन आउट करें',
    localization: 'स्थानीयकरण',
    localDesc: 'भाषा और समय क्षेत्र प्राथमिकता चुनें',
    defaultLanguage: 'डिफ़ॉल्ट भाषा',
    timezone: 'समय क्षेत्र',
    systemDetails: 'सिस्टम विवरण',
    systemDetailsDesc: 'सामान्य प्लेटफ़ॉर्म संस्करण और मेटाडेटा',
    application: 'एप्लिकेशन',
    version: 'संस्करण',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    dashboard: 'डैशबोर्ड',
    organizations: 'संगठन',
    reports: 'रिपोर्ट्स',
    models: 'मॉडल',
    inventory: 'इन्वेंट्री',
    licenses: 'लाइसेंस',
    migration: 'डेटा माइग्रेशन',
    settings: 'सेटिंग्स',
    searchPlaceholder: 'खोजें...',
    myProfile: 'मेरी प्रोफ़ाइल',
    signOut: 'साइन आउट',
    platformAdmin: 'प्लेटफ़ॉर्म एडमिन',
    administrator: 'प्रशासक',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('fg_language');
    return (saved === 'ta' || saved === 'hi' || saved === 'en') ? saved as Language : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('fg_language', lang);
  };

  const t = (key: keyof typeof translations['en']): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
