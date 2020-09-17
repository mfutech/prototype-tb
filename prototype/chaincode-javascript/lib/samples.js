'use strict';

/**
 * sample data to initialize the blockchain
 */

/**
 * list of courses
 */
exports.SAMPLE_COURSES = [
    {
        ID: 'MLG_2018',
        Acronym: 'MLG',
        Year: 2018,
        Name: 'Machine Learning',
        Teacher: 'minnie.mouse@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch'
        ],
        Active: false
    },
    {
        ID: 'MLG_2019',
        Acronym: 'MLG',
        Year: 2019,
        Name: 'Machine Learning',
        Teacher: 'minnie.mouse@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch',
            'elyas.dussier@heig-vd.ch'
        ],
        Active: false
    },
    {
        ID: 'MLG_2020',
        Acronym: 'MLG',
        Year: 2020,
        Name: 'Machine Learning',
        Teacher: 'minnie.mouse@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch',
            'elyas.dussier@heig-vd.ch',
            'jade.dussier@heig-vd.ch'
        ],
        Active: true
    },
    {
        ID: 'CLD_2018',
        Acronym: 'CLD',
        Year: 2018,
        Name: 'Cloud Computing',
        Teacher: 'daisy.duck@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch'
        ],
        Active: false
    },
    {
        ID: 'CLD_2019',
        Acronym: 'CLD',
        Year: 2019,
        Name: 'Cloud Computing',
        Teacher: 'daisy.duck@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch',
            'elyas.dussier@heig-vd.ch'
        ],
        Active: false
    },
    {
        ID: 'CLD_2020',
        Acronym: 'CLD',
        Year: 2020,
        Name: 'Cloud Computing',
        Teacher: 'daisy.duck@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch',
            'elyas.dussier@heig-vd.ch',
            'jade.dussier@heig-vd.ch'
        ],
        Active: true
    },
    {
        ID: 'SCALA_2020',
        Acronym: 'SCALA',
        Year: 2020,
        Name: 'Scala',
        Teacher: 'mulan.fa@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch',
            'elyas.dussier@heig-vd.ch',
            'jade.dussier@heig-vd.ch'
        ],
        Active: true
    },
    {
        ID: 'PEN_2020',
        Acronym: 'PEN',
        Year: 2020,
        Name: 'Projet d\'entreprise',
        Teacher: 'mulan.fa@heig-vd.ch',
        Students: [
            'amel.dussier@heig-vd.ch',
            'elyas.dussier@heig-vd.ch',
            'jade.dussier@heig-vd.ch'
        ],
        Active: true
    }
];

/**
 * list of grades
 */
exports.SAMPLE_GRADES = [
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2200',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2018',
        Value: 3,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2201',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2018',
        Value: 3.5,
        Weight: .25,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2202',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2018',
        Value: 2.5,
        Weight: .5,
        Type: 'Exam'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2203',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2018',
        Value: 4,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2204',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2018',
        Value: 3.5,
        Weight: .5,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2205',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2018',
        Value: 2.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2206',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2019',
        Value: 4.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2207',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2019',
        Value: 3.5,
        Weight: .25,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2208',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2019',
        Value: 3,
        Weight: .5,
        Type: 'Exam'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2209',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2019',
        Value: 4,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2210',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2019',
        Value: 4,
        Weight: .5,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2211',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2019',
        Value: 3.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2212',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2020',
        Value: 5.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2213',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'MLG_2020',
        Value: 4.5,
        Weight: .25,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2214',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2020',
        Value: 5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2215',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'CLD_2020',
        Value: 4.5,
        Weight: .5,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2216',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'SCALA_2020',
        Value: 4.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2217',
        Student: 'amel.dussier@heig-vd.ch',
        Course: 'PEN_2020',
        Value: 4.5,
        Weight: 1,
        Type: 'Exam'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2218',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'MLG_2019',
        Value: 4,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2219',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'MLG_2019',
        Value: 3,
        Weight: .25,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2220',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'MLG_2019',
        Value: 3,
        Weight: .5,
        Type: 'Exam'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2221',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'CLD_2019',
        Value: 2.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2222',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'CLD_2019',
        Value: 4.5,
        Weight: .5,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2223',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'CLD_2019',
        Value: 3.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2224',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'MLG_2020',
        Value: 5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2225',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'MLG_2020',
        Value: 5,
        Weight: .25,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2226',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'CLD_2020',
        Value: 5.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2227',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'CLD_2020',
        Value: 6,
        Weight: .5,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2228',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'SCALA_2020',
        Value: 5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2229',
        Student: 'elyas.dussier@heig-vd.ch',
        Course: 'PEN_2020',
        Value: 5,
        Weight: 1,
        Type: 'Exam'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2230',
        Student: 'jade.dussier@heig-vd.ch',
        Course: 'MLG_2020',
        Value: 6,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2231',
        Student: 'jade.dussier@heig-vd.ch',
        Course: 'MLG_2020',
        Value: 5.5,
        Weight: .25,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2232',
        Student: 'jade.dussier@heig-vd.ch',
        Course: 'CLD_2020',
        Value: 4.5,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2233',
        Student: 'jade.dussier@heig-vd.ch',
        Course: 'CLD_2020',
        Value: 5,
        Weight: .5,
        Type: 'Test'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2234',
        Student: 'jade.dussier@heig-vd.ch',
        Course: 'SCALA_2020',
        Value: 6,
        Weight: .25,
        Type: 'Labo'
    },
    {
        ID: 'e51be259-5960-46d1-8bc5-b587f2ea2235',
        Student: 'jade.dussier@heig-vd.ch',
        Course: 'PEN_2020',
        Value: 4.5,
        Weight: 1,
        Type: 'Exam'
    }
];