export const PREDEFINED_JOB_FIELDS = [
  {
    id: 'software_engineering',
    name: 'Software Engineering',
    category: 'Core Engineering',
    description: 'Algorithms, data structures, software design patterns, OOP, and general problem solving.',
  },
  {
    id: 'backend_development',
    name: 'Backend Development',
    category: 'Application Development',
    description: 'Server-side systems, REST APIs, databases, microservices, and system architecture.',
  },
  {
    id: 'frontend_development',
    name: 'Frontend Development',
    category: 'Application Development',
    description: 'Interactive user interfaces, modern JavaScript/TypeScript, React, responsive design, and CSS.',
  },
  {
    id: 'full_stack_development',
    name: 'Full Stack Development',
    category: 'Application Development',
    description: 'End-to-end web applications covering frontend UI, backend APIs, and database integration.',
  },
  {
    id: 'devops_cloud',
    name: 'DevOps / Cloud Engineering',
    category: 'Cloud & Infrastructure',
    description: 'CI/CD pipelines, containerization (Docker/K8s), infrastructure as code, and cloud automation.',
  },
  {
    id: 'cloud_architecture',
    name: 'Cloud Architecture',
    category: 'Cloud & Infrastructure',
    description: 'High-availability system design, cloud security, scalability, networking, and multi-cloud solutions.',
  },
  {
    id: 'data_engineering',
    name: 'Data Engineering',
    category: 'Data & Analytics',
    description: 'ETL pipelines, data warehousing, big data processing (Spark/Kafka), and SQL data modeling.',
  },
  {
    id: 'ai_machine_learning',
    name: 'AI / Machine Learning',
    category: 'Data & Analytics',
    description: 'Machine learning algorithms, deep learning models, NLP, computer vision, and Python data science.',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    category: 'Security & Operations',
    description: 'Application security, IAM, network defense, penetration testing, cryptography, and compliance.',
  },
  {
    id: 'qa_testing',
    name: 'QA / Test Engineering',
    category: 'Quality & Testing',
    description: 'Automated testing frameworks (Selenium/Playwright), API testing, integration testing, and CI/CD QA.',
  },
];

export const getJobFieldName = (fieldId) => {
  const found = PREDEFINED_JOB_FIELDS.find(f => f.id === fieldId || f.name.toLowerCase() === (fieldId || '').toLowerCase());
  return found ? found.name : (fieldId || 'Software Engineering');
};
