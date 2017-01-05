"""A set of tests for the garden models."""

import datetime
import json
import unittest

import garden


class TestGarden(unittest.TestCase):

    def testPlantCreatedCorrectlyUsingGrowthTime(self):
        plant = garden.Plant("test", datetime.date(2000, 1, 1), 60)
        self.assertEqual(2000, plant.harvest_date.year)
        self.assertEqual(3, plant.harvest_date.month)
        self.assertEqual(1, plant.harvest_date.day)

    def testPlantSerialize(self):
        plant = garden.Plant("test", datetime.date(2000, 1, 1), 60)
        plant2 = garden.Plant.Load(plant.Serialize())
        self.assertEqual(plant.name, plant2.name)
        self.assertEqual(plant.plant_date, plant2.plant_date)
        self.assertEqual(plant.harvest_date, plant2.harvest_date)

    def testGardenGetSlotWorksForVariousSizes(self):
        g = garden.Garden("test", 10, 10)
        self.assertIsNotNone(g._GetSlot(0, 0))
        self.assertIsNotNone(g._GetSlot(9, 9))
        self.assertIsNotNone(g._GetSlot(5, 4))
        with self.assertRaises(IndexError):
            g._GetSlot(-1, 0)

        with self.assertRaises(IndexError):
            g._GetSlot(0, -1)

        with self.assertRaises(IndexError):
            g._GetSlot(10, 0)

        with self.assertRaises(IndexError):
            g._GetSlot(0, 10)

    def testGardenAddPlantFailsWithOverlappingPlant(self):
        g = garden.Garden("test", 1, 1)
        plant1 = garden.Plant("plant1", datetime.date(2000, 1, 1), 2)
        plant2 = garden.Plant("plant2", datetime.date(2000, 1, 2), 1)
        plant3 = garden.Plant("plant3", datetime.date(2000, 1, 3), 10)
        g.AddPlant(0, 0, plant1)
        self.assertIs(plant1, g.slots[0][0])

        with self.assertRaises(ValueError):
            g.AddPlant(0, 0, plant2)

        g.AddPlant(0, 0, plant3)
        self.assertIs(plant1, g.slots[0][0])
        self.assertIs(plant3, g.slots[0][1])

    def testGardenSerialize(self):
        plant000 = garden.Plant("plant1", datetime.date(2000, 1, 1), 2)
        plant001 = garden.Plant("plant3", datetime.date(2000, 1, 3), 10)
        plant010 = garden.Plant("plant2", datetime.date(2000, 1, 2), 1)

        g1 = garden.Garden("test", 2, 1)
        g1.AddPlant(0, 0, plant001)
        g1.AddPlant(0, 0, plant000)
        g1.AddPlant(1, 0, plant010)

        g2 = garden.Garden.Load(g1.Serialize())
        self.assertEqual(g1.name, g2.name)
        self.assertEqual(g1.size, g2.size)
        self.assertEqual(g1.slots[0][0].name, g2.slots[0][0].name)
        self.assertEqual(g1.slots[0][1].name, g2.slots[0][1].name)
        self.assertEqual(g1.slots[1][0].name, g2.slots[1][0].name)

        



if __name__ == '__main__':
    unittest.main()
