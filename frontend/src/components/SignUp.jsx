import React, { useContext, useState } from 'react'
import { authStyles as styles } from '../assets/dummystyle'
import { useNavigate } from 'react-router-dom';
import {validateEmail} from '../utils/helper'
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import { Input } from './Inputs';
import { UserContext } from '../context/UserContext';

const SignUp = ({ setCurrentPage }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState(null);
    const { updateUser } = useContext(UserContext);
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        if(!fullName){
            setError("Please enter your full name");
            return;
        }
        if(!validateEmail(email)){
            setError("Please enter a valid email address");
            return;
        }
        if(!password){
            setError("Please enter a password");
            return;
        }
        setError('');
        try {
            const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
                name: fullName,
                email: email,
                password: password
            });

            const {token} = response.data;
            if(token){
                localStorage.setItem('token', token);
                updateUser(response.data);
                navigate('/dashboard');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred during registration.');
        }
    }
  return (
    <div className={styles.signupContainer}>
        <div className={styles.headerWrapper}>
        <h3 className={styles.signupTitle}>Create Account</h3>
        <p className={styles.signupSubtitle}>Join us today and start building your professional resume</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignUp} className={styles.signupForm}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} label="Full Name" placeholder="Prince Jain" type='text' />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} label="Email Address" placeholder="prince@example.com" type='email' />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} label="Password" placeholder="Min 8 characters" type='password' />
            {error && <div className={styles.errorMessage}>{error}</div>}
            <button type='submit' className={styles.signupSubmit}>
                Create Account
            </button>

            {/* footer */}

            <p className={styles.switchText}>
                Already have an account?{' '}
                <button onClick={() => setCurrentPage('login')} 
                type='button' className={styles.signupSwitchButton}>
                    Sign In
                </button>
            </p>
        </form>
    </div>
  )
}

export default SignUp