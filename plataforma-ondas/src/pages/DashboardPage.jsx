import React from 'react';
import Navbar from '../components/Navbar';
import { Container, Typography } from '@mui/material';

function DashboardPage() {
  return (
    <>
      <Navbar />
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Typography variant="h5">Dashboard del Usuario</Typography>
      </Container>
    </>
  );
}

export default DashboardPage;
