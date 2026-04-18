import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  instructorProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  instructorProfile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [instructorProfile, setInstructorProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let currentUserData = null;
        
        if (userDoc.exists()) {
          currentUserData = userDoc.data();
        } else {
          // Check if email matches admin
          let role = user.email === 'yogeshdhande26@gmail.com' ? 'admin' : 'instructor';
          
          try {
            // Check if student exists in database
            const studentSnap = await getDocs(query(collection(db, 'students'), where('email', '==', user.email)));
            if (!studentSnap.empty) {
              role = 'student';
            } else {
              // Check if instructor exists in database
              const instructorSnap = await getDocs(query(collection(db, 'instructors'), where('email', '==', user.email)));
              if (!instructorSnap.empty) {
                role = 'instructor';
              }
            }
          } catch (err) {
            console.error('Error auto-detecting user role:', err);
          }

          // Create user doc if it doesn't exist
          currentUserData = {
            uid: user.uid,
            email: user.email,
            role: role,
            displayName: user.displayName,
          };
          await setDoc(doc(db, 'users', user.uid), currentUserData);
        }
        setUserData(currentUserData);

        // If instructor, try to find their profile in instructors collection
        if (currentUserData.role === 'instructor') {
          try {
            const instructorsRef = collection(db, 'instructors');
            const q = query(instructorsRef, where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              setInstructorProfile({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
            } else {
              // Also check by email if UID not linked yet
              const qEmail = query(instructorsRef, where('email', '==', user.email));
              const querySnapshotEmail = await getDocs(qEmail);
              
              if (!querySnapshotEmail.empty) {
                const profile = { id: querySnapshotEmail.docs[0].id, ...querySnapshotEmail.docs[0].data() };
                // Link UID to instructor profile
                try {
                  await updateDoc(doc(db, 'instructors', profile.id), { uid: user.uid });
                  setInstructorProfile({ ...profile, uid: user.uid });
                } catch (updateErr) {
                  console.error('Error linking instructor UID:', updateErr);
                  // Still set the profile so they can see their dashboard, even if linking failed
                  setInstructorProfile(profile);
                }
              }
            }
          } catch (fetchErr) {
            console.error('Error fetching instructor profile:', fetchErr);
          }
        }
      } else {
        setUserData(null);
        setInstructorProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    instructorProfile,
    loading,
    isAdmin: userData?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
